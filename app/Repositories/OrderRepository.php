<?php

namespace App\Repositories;

use App\Models\Addresses;
use App\Models\Admin;
use App\Models\Clients;
use App\Models\Coupon;
use App\Models\DeliveryBoyOrder;
use App\Models\Languages;
use App\Models\Orders as Model;
use App\Models\OrdersComment;
use App\Models\OrdersDetail;
use App\Models\OrdersDetailExtras;
use App\Models\OrderShippingDetail;
use App\Models\OrdersStatus;
use App\Models\Products;
use App\Models\Shops;
use App\Repositories\Interfaces\OrderInterface;
use App\Repositories\Interfaces\TransactionInterface;
use App\Traits\ApiResponse;
use App\Traits\DatatableResponse;
use App\Traits\SendNotification;
use Carbon\Carbon;

class OrderRepository extends CoreRepository implements OrderInterface
{
    use ApiResponse;
    use DatatableResponse;
    use SendNotification;

    protected $transaction;
    protected $product;

    public function __construct(TransactionInterface $transaction, Products $product)
    {
        parent::__construct();
        $this->transaction = $transaction;
        $this->product = $product;
    }

    protected function getModelClass()
    {
        return Model::class;
    }

    public function delete($id)
    {
        Model::find($id)->delete();

        return $this->successResponse("success");
    }

    public function createOrUpdateForRest($collection = [])
    {
        // Check Shop AmountLimit before create Order
        $amount_limit = Shops::amountLimit($collection['shop']);
        if ($amount_limit > $collection['total_amount']) {
            return $this->errorResponse("Minimum amount for order is " . $amount_limit);
        }

        // Check products in stock and Set for Order
        $products = $this->setOrderProducts($collection['product_details']);
        if($products->contains('quantity', 0)){
            return  $this->successResponse('Some product not enough in stock', ['missed_products' =>  $products]);
        }

        try {
            $defaultAddress = Addresses::where([
                "id_user" => $collection['user'],
                "default" => 1
            ])->first();

            if ($defaultAddress) {
                $defaultAddress->default = 0;
                $defaultAddress->save();
            }

            $address = Addresses::updateOrCreate([
                "latitude" => round($collection['address']['lat'], 4),
                "longtitude" => round($collection['address']['lng'], 4),
                "id_user" => $collection['user'],
            ], [
                'latitude' => round($collection['address']['lat'], 4),
                'longtitude' => round($collection['address']['lng'], 4),
                'address' => $collection['address']['address'],
                'default' => 1,
                'active' => 1,
                'id_user' => $collection['user']
            ]);


            if ($address) {
                $id_address = $address->id;

                // check Coupon and calculate it with Order price
                if (isset($collection['coupon'])) {
                    $coupon = Coupon::CheckCoupon($collection['coupon']);
                    if ($coupon && $collection['total_amount'] > $coupon['discount']) {
                        $summa = $collection['total_amount'] - $coupon['discount'];
                    }
                }

                $order = Model::create([
                    'tax' => $collection['tax'],
                    "total_sum" => $summa ?? $collection['total_amount'],
                    "total_discount" => $collection['total_discount'],
                    'delivery_date' => $collection['delivery_date'],
                    'delivery_time_id' => $collection['delivery_time_id'],
                    "delivery_fee" => $collection['delivery_fee'],
                    'active' => 1,
                    'type' => $collection['delivery_type'],
                    'comment' => $collection['comment'],
                    'id_user' => $collection['user'],
                    'order_status' => 1,
                    'id_shop' => $collection['shop'],
                    'id_delivery_address' => $id_address
                ]);


                if ($order) {
                    // Create Order Products for details
                    if (count($products) > 0) {
                        $productIds = $this->setOrderProductDetails($order, $products);
                        // Set Order Deleted Product quantity
                        $this->setOrderDeleteProducts($order, $productIds);
                    }

                    OrderShippingDetail::create([
                        'order_id' => $order->id,
                        'delivery_type_id' => $collection['delivery_type_id'] ?? 0,
                        'delivery_transport_id' => $collection['delivery_transport_id'] ?? 0,
                        'shipping_box_id' => $collection['shipping_box_id'] ?? 0,
                    ]);
                    return $this->successResponse("success", $order);
                }
            }
            return $this->errorResponse("error in saving faq");
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    public function get($id)
    {

        $defaultLanguage = Languages::where("default", 1)->first();

        $order = Model::with([
            "details.product.language" => function ($query) use ($defaultLanguage) {
                $query->where('id_lang', $defaultLanguage->id);
            },
            "review", "orderDeliveryBoy",
            'deliveryType.deliveryType' => function ($q) use ($defaultLanguage) {
                $q->where('lang_id', $defaultLanguage->id);
            },
            'deliveryTransport.deliveryTransport' => function ($q) use ($defaultLanguage) {
                $q->where('lang_id', $defaultLanguage->id);
            },
            'deliveryBox.shippingBox' => function ($q) use ($defaultLanguage) {
                $q->where('lang_id', $defaultLanguage->id);
            }
        ])->where("id", $id)->first();

        if ($order) {
            foreach ($order['details'] as $key => $value) {
                $order['details'][$key]['name'] = $order['details'][$key]['product']['language']['name'];
                $order['details'][$key]['in_stock'] = $order['details'][$key]['product']['quantity'];
            }


            return $this->successResponse("success", $order);
        }
        return $this->errorResponse("Order not found");
    }

    public function changeOrderStatus($id_order, $status)
    {
        $order = Model::with('deliveryRoute', 'orderDeliveryBoy')->findOrFail($id_order);
        if ($order && $status != 5) {
            $order->order_status = $status;

            if ($status == 2)
                $order->processing_date = date("Y-m-d H:i:s");
            else if ($status == 3)
                $order->ready_date = date("Y-m-d H:i:s");
            else if ($status == 4)
                $order->delivered_date = date("Y-m-d H:i:s");

            $order->save();
            $this->deliveryBoyOrderStatus($id_order, $order->id_delivery_boy, 1);
        } else if ($status == 5) {
            $order->order_status = $status;
            $order->save();

            $this->deliveryBoyOrderStatus($id_order, $order->id_delivery_boy, 2);
        }
        if ($status == 4) {
            $params = [
                'shop_id' => $order->id_shop, 'admin_id' => $order->orderDeliveryBoy->id,
                'order_id' => $order->id, 'type' => 'CREDIT',
                'note' => 'Topup for Delivery Order #' . $order->id,
                'amount' => $order->deliveryRoute->price ?? $order->delivery_fee,
                'status' => 1,
                'status_description' => 'Successful',
            ];
            $transaction = $this->transaction->createOrUpdate($params);
            if ($transaction) {
                $deliveryBoy = Admin::find($order->orderDeliveryBoy->id);
                $deliveryBoy->balance()->update([
                    'balance' => $deliveryBoy->balance->balance + ($order->deliveryRoute->price ?? $order->delivery_fee)
                ]);
            }
        }

        return $this->successResponse("success", $order);
    }

    public function getOrderDetailByStatusForRest($collection = [])
    {
        $statuses = [intval($collection['status'])];
        if ($collection['status'] == 2) $statuses = [2, 3];

        $order = Model::with([
            "shop.language" => function ($query) use ($collection) {
                $query->id_lang = $collection['id_lang'];
            },
            "details",
            "timeUnit",
            "address",
            "deliveryBoy",
            "details.product.language" => function ($query) use ($collection) {
                $query->id_lang = $collection['id_lang'];
            },
            "details.product.images",
            "details.product.units.language",
        ])->where([
            "id_user" => $collection['id_user']
        ])
            ->whereIn("order_status", $statuses)
            ->skip($collection['offset'])
            ->take($collection['limit'])
            ->orderBy("id", "DESC")
            ->get();

        return $this->successResponse("success", $order);
    }

    public function getOrderCountByStatusAndClient($collection = [])
    {
        if (is_array($collection['status']))
            $order = Model::where([
                "id_user" => $collection['id_user']
            ])->whereIn("order_status", $collection['status'])->count();
        else
            $order = Model::where([
                "id_user" => $collection['id_user']
            ])->where("order_status", $collection['status'])->count();

        return $this->successResponse("success", $order);
    }

    public function createOrUpdate($collection = [])
    {
        $amount_limit = Shops::amountLimit($collection['id_shop']);
        if ($amount_limit > $collection['total_amount']) {
            return $this->errorResponse("Minimum amount for order is " . $amount_limit);
        }

        // Check products in stock and Set for Order
        $products = $this->setOrderProducts($collection['product_details']);
        if($products->contains('quantity', 0)){
            return  $this->successResponse('Some product not enough in stock', ['missed_products' =>  $products]);
        }

        // check Coupon and calculate it with Order price
        if (isset($collection['coupon'])) {
            $coupon = Coupon::CheckCoupon($collection['coupon']);
            if ($coupon && $collection['total_amount'] > $coupon['discount']) {
                $summa = $collection['total_amount'] - $coupon['discount'];
            }
        }

        $order = Model::updateOrCreate([
            "id" => $collection["id"] ?? null
        ], [
            'tax' => $collection['tax'],
            "total_sum" => $summa ?? $collection['total_amount'],
            "total_discount" => $collection['total_discount'],
            "delivery_date" => date("y-m-d", strtotime($collection['delivery_date'])),
            "delivery_time_id" => $collection["delivery_time_id"],
            "delivery_fee" => $collection['delivery_fee'],
            "comment" => $collection["comment"] ?? "",
            "active" => 1,
            "type" => $collection["type"],
            "id_user" => $collection["id_user"],
            "order_status" => $collection["order_status"],
            "id_shop" => $collection["id_shop"],
            "id_delivery_address" => $collection["id_delivery_address"],
            "id_delivery_boy" => $collection['delivery_boy'] ?? null,
            "processing_date" => $collection["order_status"] == 2 ? date("Y-m-d H:i:s") : "",
            "ready_date" => $collection["order_status"] == 3 ? date("Y-m-d H:i:s") : "",
            "delivered_date" => $collection["order_status"] == 4 ? date("Y-m-d H:i:s") : "",
            "cancel_date" => $collection["order_status"] == 5 ? date("Y-m-d H:i:s") : "",
        ]);

        if ($order) {
            // Add coupon to Order
            if (isset($collection['coupon'])) {
                if (!$order->coupon) {
                    $coupon->update(['usage_time' => $coupon->usage_time - 1]);
                }
                $coupon->details()->updateOrCreate(['order_id' => $order->id], [
                    'used_time' => $order->created_at,
                    'client_id' => $collection["id_user"],
                ]);
            }

            $user = Clients::find($collection['id_user']);

            $message = "";
            if ($collection["order_status"] == 1) {
                $message = $user->name . ", Your order accepted";
            } else if ($collection["order_status"] == 2) {
                $message = $user->name . ", Your order ready to delivery";
            } else if ($collection["order_status"] == 3) {
                $message = $user->name . ", Your order is in a way";
            } else if ($collection["order_status"] == 4) {
                if ($order->orderDeliveryBoy != null) {
                    $deliveryBoy = Admin::find($order->orderDeliveryBoy->id);
                    $deliveryBoy->balance()->update([
                        'balance' => $deliveryBoy->balance->balance + $order->deliveryRoute->price
                    ]);
                }
                $message = $user->name . ", Your order delivered";
            } else if ($collection["order_status"] == 5) {
                $message = $user->name . ", Your order canceled";
            }

            if ($user)
                $this->sendNotificationtoSingleUser($user->push_token, $message);

            $order_id = $order->id;

            if (isset($collection['comment']) && strlen($collection['comment']) > 1) {
                $order_review = OrdersComment::updateOrCreate([
                    "id_order" => $order_id
                ], [
                    "comment_text" => $collection['comment'],
                    "active" => 1,
                    "id_user" => $collection["id_user"],
                    "id_order" => $order_id
                ]);

                if ($order_review) {
                    $id_order_review = $order_review->id;
                    $order->id_review = $id_order_review;
                    $order->save();
                }
            }

            // Create Order Products for details
            if (count($products) > 0) {
                $productIds = $this->setOrderProductDetails($order, $products);
                // Set Order Deleted Product quantity
                $this->setOrderDeleteProducts($order, $productIds);
            }

            OrderShippingDetail::create([
                'order_id' => $order_id,
                'delivery_type_id' => $collection['shipping_id'] ?? 0,
                'delivery_transport_id' => $collection['id_shipping_transport'] ?? 0,
                'shipping_box_id' => $collection['id_shipping_box'] ?? 0,
            ]);

            //Set order delivery boy
            if (isset($collection['delivery_boy'])) {
                DeliveryBoyOrder::updateOrCreate([
                    "admin_id" => $collection['delivery_boy'],
                    "order_id" => $order->id
                ], [
                    "status" => $collection["order_status"]
                ]);
            }

            $order = $this->model->with('details', 'coupon')->find($order->id);
            return $this->successResponse("success", $order);
        }

        return $this->errorResponse("Error in saving");
    }

    public function orderStatusDatatable($collection = [])
    {
        $totalData = OrdersStatus::count();

        $totalFiltered = $totalData;

        $datas = OrdersStatus::skip($collection['start'])
            ->limit($collection['length'])
            ->get();

        $responseData = array();
        if (!empty($datas)) {
            foreach ($datas as $data) {
                $nestedData['id'] = $data->id;
                $nestedData['name'] = $data->name;
                $nestedData['active'] = $data->active;
                $responseData[] = $nestedData;

            }
        }

        return $this->responseJsonDatatable($totalData, $totalFiltered, $responseData);
    }

    public function getActiveStatus()
    {
        $paymentStatus = OrdersStatus::where([
            "active" => 1
        ])->get();

        return $this->successResponse("success", $paymentStatus);
    }

    public function datatable($collection = [])
    {
        $shop_id = Admin::getUserShopId();

        if ($shop_id == -1) {
            if (isset($collection['status']) || (isset($collection['order_date_from']) && isset($collection['order_date_to'])) || isset($collection['id_delivery_boy'])) {
                $totalData = Model::where("active", '>=', 0);

                if (isset($collection['status'])) {
                    $totalData = $totalData->whereIn('order_status', [$collection['status']]);
                }

                if (isset($collection['order_date_from']) && isset($collection['order_date_to'])) {
                    $to = Carbon::parse($collection['order_date_to'])->addDay(); // Add one day to include $collection['order_date_to'] in the interval
                    $totalData = $totalData->whereBetween('created_at', [$collection['order_date_from'], $to]);
                }

                if (isset($collection['id_delivery_boy'])) {
                    $totalData = $totalData->whereHas('deliveryBoy', function ($query) use ($collection) {
                        $query->where('id', $collection['id_delivery_boy']);
                    });
                }

                if (isset($collection['shop_id'])) {
                    $totalData = $totalData->where('id_shop', $collection['shop_id']);
                }

                $totalData = $totalData->count();
            } else
                $totalData = Model::count();
        } else {
            $totalData = Model::where("id_shop", $shop_id);

            if (isset($collection['status'])) {
                $totalData = $totalData->whereIn('order_status', [$collection['status']]);
            }

            if (isset($collection['order_date_from']) && isset($collection['order_date_to'])) {
                $to = Carbon::parse($collection['order_date_to'])->addDay(); // Add one day to include $collection['order_date_to'] in the interval
                $totalData = $totalData->whereBetween('created_at', [$collection['order_date_from'], $to]);
            }

            if (isset($collection['id_delivery_boy'])) {
                $totalData = $totalData->whereHas('deliveryBoy', function ($query) use ($collection) {
                    $query->where('id', $collection['id_delivery_boy']);
                });
            }

            if (isset($collection['shop_id'])) {
                $totalData = $totalData->where('id_shop', $collection['shop_id']);
            }

            $totalData = $totalData->count();
        }

        $totalFiltered = $collection['length'] ?? 0;

        $defaultLanguage = Languages::where("default", 1)->first();

        $datas = Model::with([
            "shop.language" => function ($query) use ($defaultLanguage) {
                $query->id_lang = $defaultLanguage->id;
            },
            "orderStatus",
            "paymentStatus",
            "paymentMethod",
            "timeUnit",
            "address",
            "clients",
            "deliveryRoute",
            "deliveryBoy"
        ]);

        if ($shop_id != -1) {
            $datas = $datas->where('orders.id_shop', $shop_id);
        }

        // Filter orders by request params
        //$query = isset($collection['status']) ? ['order_status' => $status] : [];
        $sort = isset($collection['sort']) && $collection['sort'] == 'desc';
        if (isset($collection['order_date_from']) && isset($collection['order_date_to'])) {
            $to = Carbon::parse($collection['order_date_to'])->addDay(); // Add one day to include $collection['order_date_to'] in the interval
            $datas = $datas->whereBetween('created_at', [$collection['order_date_from'], $to]);
        }
        if (isset($collection['id_delivery_boy'])) {
            $datas = $datas->whereHas('deliveryBoy', function ($query) use ($collection) {
                $query->where('id', $collection['id_delivery_boy']);
            });
        }

        if (isset($collection['status'])) {
            $datas = $datas->whereIn('order_status', [$collection['status']]);
        }

        if (isset($collection['shop_id'])) {
            $datas = $datas->where('id_shop', $collection['shop_id']);
        }

        $datas = $datas
            ->orderByDesc('id')
            ->skip($collection['start'])
            ->take($collection['length'])
            ->get();

        if (isset($collection['sort'])) {
            $datas = $datas->sortBy('order_status', 1, $sort);
        }

        $responseData = array();
        if (!empty($datas)) {
            foreach ($datas as $data) {
                $nestedData['id'] = $data->id;
                $nestedData['amount'] = $data->total_sum;
                $nestedData['order_status'] = $data->orderStatus->name;
                $nestedData['order_status_id'] = $data->order_status;
                $nestedData['delivery_date'] = $data->delivery_date . " " . $data->timeUnit != null ? $data->timeUnit->name : "";
                $nestedData['delivery_boy'] = $data->deliveryBoy != null ? $data->deliveryBoy->name . " " . $data->deliveryBoy->surname : "";
                $nestedData['order_date'] = date("Y-m-d H:i:s", strtotime($data->created_at));
                $nestedData['user'] = $data->clients->name . " " . $data->clients->surname;
                $nestedData['shop'] = $data['id_shop'] != null && $data->shop ? $data->shop->language->name : "-";
                $nestedData['shop_lng_lat'] = $data['id_shop'] != null && $data->shop ? $data->shop->longtitude . "," . $data->shop->latitude : "";
                $nestedData['address_lng_lat'] = $data->address->longtitude . "," . $data->address->latitude;
                $nestedData['active'] = $data->active;
                $nestedData['payment_method'] = $data->transaction ? $data->transaction->payment->name : 'no payment' ;
                $nestedData['payment_status'] = $data->transaction ? $data->transaction->payment->name : 'In process' ;
                $nestedData['options'] = [
                    'delete' => 1,
                    'edit' => 1
                ];
                $responseData[] = $nestedData;

            }
        }

        return $this->responseJsonDatatable($totalData, $totalFiltered, $responseData);
    }

    public function commentsDatatable($collection = [])
    {
        $id_shop = Admin::getUserShopId();
        if ($id_shop == -1)
            $totalData = OrdersComment::count();
        else
            $totalData = OrdersComment::with([
                "order" => function ($query) use ($id_shop) {
                    $query->id_shop = $id_shop;
                }
            ])->has("order")->count();

        $totalFiltered = $totalData;

        $datas = OrdersComment::with([
            "order" => function ($query) use ($id_shop) {
                $query->id_shop = $id_shop;
            },
            "order.clients"
        ]);

        if ($id_shop != -1)
            $datas = $datas->has("order");

        $datas = $datas->skip($collection['start'])
            ->take($collection['length'])
            ->get();

        $responseData = array();
        if (!empty($datas)) {
            foreach ($datas as $data) {
                $nestedData['id'] = $data->id;
                $nestedData['client'] = $data->clients != null ? ($data->clients->name . " " . $data->clients->surname) : "";
                $nestedData['text'] = $data->comment_text;
                $nestedData['order'] = $data->id_order;
                $nestedData['active'] = $data->active;
                $nestedData['options'] = [
                    'delete' => 1,
                ];
                $responseData[] = $nestedData;
            }
        }

        return $this->responseJsonDatatable($totalData, $totalFiltered, $responseData);
    }

    public function getActiveClients()
    {
        $id_shop = Admin::getUserShopId();
        if ($id_shop == -1)
            $count = Model::groupBy("id_user")->count();
        else
            $count = Model::where("id_shop", $id_shop)->groupBy("id_user")->count();

        return $this->successResponse("success", $count);
    }

    public function getTotalOrdersCount()
    {
        $id_shop = Admin::getUserShopId();
        if ($id_shop == -1)
            $count = Model::count();
        else
            $count = Model::where("id_shop", $id_shop)->count();

        return $this->successResponse("success", $count);
    }

    public function getOrdersStaticByStatus()
    {
        $id_shop = Admin::getUserShopId();

        $canceled = [];
        $delivered = [];

        for ($i = 9; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-" . $i . " days"));

            if ($id_shop == -1)
                $canceledCount = Model::where([
                    "order_status" => 5,
                    ["created_at", ">=", $date . " 00:00:00"],
                    ["created_at", "<=", $date . " 23:59:59"]
                ])->count();
            else
                $canceledCount = Model::where([
                    "id_shop" => $id_shop,
                    "order_status" => 5,
                    ["created_at", ">=", $date . " 00:00:00"],
                    ["created_at", "<=", $date . " 23:59:59"]
                ])->count();

            if ($id_shop == -1)
                $deliveredCount = Model::where([
                    "order_status" => 4,
                    ["created_at", ">=", $date . " 00:00:00"],
                    ["created_at", "<=", $date . " 23:59:59"]
                ])->count();
            else
                $deliveredCount = Model::where([
                    "id_shop" => $id_shop,
                    "order_status" => 4,
                    ["created_at", ">=", $date . " 00:00:00"],
                    ["created_at", "<=", $date . " 23:59:59"]
                ])->count();

            $canceled[] = ["time" => date("m-d", strtotime($date)), "value" => $canceledCount, "type" => 'Canceled'];
            $delivered[] = ["time" => date("m-d", strtotime($date)), "count" => $deliveredCount, "name" => 'Delivered'];
        }

        return $this->successResponse("success", [
            $canceled,
            $delivered
        ]);
    }

    public function getShopsSalesInfo()
    {
        $id_shop = Admin::getUserShopId();

        $defaultLanguage = Languages::where("default", 1)->first();

        $data = [];
        if ($id_shop == -1)
            $ordersData = Model::groupBy("id_shop")->with(
                [
                    "shop.language" => function ($query) use ($defaultLanguage) {
                        $query->id_lang = $defaultLanguage->id;
                    }
                ]
            )->selectRaw('*, sum(total_sum) as totalSum')->get();
        else
            $ordersData = Model::groupBy("id_shop")->with(
                [
                    "shop.language" => function ($query) use ($defaultLanguage) {
                        $query->id_lang = $defaultLanguage->id;
                    }
                ]
            )
                ->where("id_shop", $id_shop)
                ->selectRaw('*, sum(total_sum) as totalSum')->get();

        foreach ($ordersData as $order) {
            $data[] = [
                "shop" => $order['shop']['language']['name'],
                "value" => $order['totalSum']
            ];
        }

        return $this->successResponse("success", $data);
    }

    public function getOrderForDeliveryBoy($collection = [])
    {
        $where = [
            "id_delivery_boy" => $collection['id_delivery_boy']
        ];

        if ($collection['status'] < 5) {
            $where["order_status"] = $collection['status'];
        }

        $order = Model::with([
            "shop.language" => function ($query) use ($collection) {
                $query->id_lang = $collection['id_lang'];
            },
            "timeUnit",
            "details",
            "clients",
            "address",
            "deliveryBoy",
            "details.product.language" => function ($query) use ($collection) {
                $query->id_lang = $collection['id_lang'];
            },
            "details.product.images"
        ])->whereHas(
            "deliveryBoyOrder", function ($query) use ($collection) {
            $status = 0;
            if ($collection['status'] >= 1 && $collection['status'] < 5) $status = 1;
            else if ($collection['status'] == 5) $status = 2;

            $query->where([
                "admin_id" => $collection['id_delivery_boy'],
                "status" => $status
            ]);
        })
            ->where($where)
            ->skip($collection['offset'])
            ->take($collection['limit'])
            ->get();

        return $this->successResponse("success", $order);
    }

    public function getDeliveryBoyStatistics($id_delivery_boy)
    {
        $newOrder = Model::where([
            "id_delivery_boy" => $id_delivery_boy,
            "order_status" => 1
        ])
            ->count();
        $acceptedOrder = Model::where([
            "id_delivery_boy" => $id_delivery_boy,
            "order_status" => 2
        ])
            ->count();
        $onAWayOrder = Model::where([
            "id_delivery_boy" => $id_delivery_boy,
            "order_status" => 3
        ])
            ->count();
        $deliveredOrder = Model::where([
            "id_delivery_boy" => $id_delivery_boy,
            "order_status" => 4
        ])
            ->count();
        $cancelOrder = Model::where([
            "id_delivery_boy" => $id_delivery_boy,
        ])->whereHas(
            "deliveryBoyOrder", function ($query) use ($id_delivery_boy) {
            $query->where([
                "admin_id" => $id_delivery_boy,
                "status" => 2
            ]);
        })
            ->count();

        return $this->successResponse("success", [
            'new' => $newOrder,
            'accepted' => $acceptedOrder,
            'onaway' => $onAWayOrder,
            'delivered' => $deliveredOrder,
            'cancel' => $cancelOrder,
            'measure' => max([$newOrder, $acceptedOrder, $onAWayOrder, $deliveredOrder, $cancelOrder]),
            'deliveredPercentage' => $cancelOrder == 0 ? 100 : intval(($deliveredOrder * 100) / ($cancelOrder + $deliveredOrder))
        ]);
    }

    public function deliveryBoyOrderStatus($order_id, $admin_id, $status)
    {
        $result = DeliveryBoyOrder::where(['order_id' => $order_id, 'status' => 1])->first();
        if ($result) {
            return $this->errorResponse('Order already accepted');
        }
        $deliveryStatus = DeliveryBoyOrder::where(['order_id' => $order_id, 'admin_id' => $admin_id])->first();

        if ($deliveryStatus) {
            $deliveryStatus->update(['status' => $status]);
            return $this->successResponse('Success', $deliveryStatus);
        }

        return $this->errorResponse('Record not found');
    }


    public function checkoutForRest($array = [])
    {
        $products = $this->product->with([
            'actualDiscount', 'extras.extras',
            'extras.extras' => function ($q) {
                $q->where('active', 1);
            },
            'taxes' => function ($q) {
                $q->where('active', 1);
            },
        ])->whereIn('id', $array['products'])->get();

        return $this->successResponse('Success', $products);
    }

    /**
     *
     *
     */
    private function setOrderProducts($array = [])
    {
        if (isset($array) && count($array) > 0) {
            $products = [];
            foreach ($array as $product) {
                array_push($products, [$product['id']]);
            }
            $products = $this->product
                ->whereIn('id', $products)
                ->select('id', 'quantity', 'price', 'id_category', 'id_shop')->get();

            if (count($products) > 0) {
                $products->map(function ($product, $key) use ($array) {
                    foreach ($array as $item) {
                        if ($product->id == $item['id']) {
                            if ($product->quantity < $item['quantity']) {
                                $product->price = 0;
                                $product->message = "Not enough products in stock";
                            } else {
                                $product->quantity = (int)$item['quantity'];
                                $product->discount = $item['discount'] ?? 0;
                            }
                            $product->is_replaced = $item['is_replaced'] ?? 0;
                            $product->id_replace_product = $item['id_replace_product'] ?? null;

                            if ($product->is_replaced) {
                                $product->price = 0;
                                $product->discount = 0;
                                $product->quantity = 0;
                            }
                        }
                    }
                });
            }

            // Check products in stock and send MissedProducts
            $missed = collect();
            foreach ($products as $product){
                if ($product->quantity == 0) {
                    $missed = $missed->push($product);
                }
            }
            return count($missed) > 0 ? collect(['missed' => $missed]) : $products;
        } else {
            return false;
        }
    }

    // Set quantity of Product Model before deleting unnecessary Order products
    private function setOrderDeleteProducts(Model $order, $ids)
    {
        $deleted = $order->details()->whereNotIn('id_product', $ids)->get();
        if (count($deleted) > 0) {
            foreach ($deleted as $delete) {
                $product = $this->product->find($delete->id_product);
                $product->update(['quantity' => $product->quantity + $delete->quantity]);
                $delete->delete();
            }
        }
        return true;
    }

    // Set OrderProductDetails
    private function setOrderProductDetails($order, $collections)
    {
        $productIds = [];
        foreach ($collections as $product) {

            $productDetail = $order->details()->where('id_product', $product->id)->first();

            $detail = $order->details()->updateOrCreate(['id_product' => $product->id ?? null], [
                "quantity" => $product->quantity,
                "discount" => $product->discount,
                "price" => $product->price,
                "is_replaced" => $product->is_replaced,
                "id_replace_product" => $product->id_replace_product,
            ]);
            array_push($productIds, $product->id);

            /*      if ($detail) {
                      if (count($product["extras"]) > 0) {
                          foreach ($product["extras"] as $extras) {
                              OrdersDetailExtras::create([
                                  'id_order_detail' => $detail->id,
                                  'id_extras' => $extras['id'],
                                  'price' => $extras['price']
                              ]);
                          }
                      }
                  }*/
            // Set Product Model quantity
            if (!$productDetail) {
                $prod = $this->product->find($detail->id_product);
                $prod->update(['quantity' => $prod->quantity - $detail->quantity]);
            } else {
                if ($product->is_replaced) {
                    $qty = $productDetail->quantity;
                    $prod = $this->product->find($detail->id_product);
                    $prod->update(['quantity' => $prod->quantity + $qty]);
                    $productDetail->update(['quantity' => 0]);
                } else {
                    if ($productDetail->quantity > $product->quantity) {
                        $qty = $productDetail->quantity - $product->quantity;
                        $prod = $this->product->find($detail->id_product);
                        $prod->update(['quantity' => $prod->quantity + $qty]);

                    } elseif ($productDetail->quantity < $product->quantity) {
                        $qty = $product->quantity - $productDetail->quantity;
                        $prod = $this->product->find($detail->id_product);
                        $prod->update(['quantity' => $prod->quantity - $qty]);
                    }
                }

            }
        }
        return $productIds;
    }
}
