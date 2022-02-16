<?php

namespace App\Repositories;

use App\Models\Languages;
use App\Models\Orders;
use App\Models\PaymentAttribute;
use App\Models\Payments;
use App\Models\PaymentsMethod as Model;
use App\Models\PaymentsStatus;
use App\Models\ShopPayment;
use App\Repositories\Interfaces\PaymentInterface;
use App\Repositories\Payment\PaystackRepository;
use App\Repositories\Payment\StripeRepository;
use App\Traits\ApiResponse;
use App\Traits\DatatableResponse;

class PaymentRepository extends CoreRepository implements PaymentInterface
{
    use ApiResponse;
    use DatatableResponse;

    public function __construct()
    {
        parent::__construct();
    }

    protected function getModelClass()
    {
        return Model::class;
    }

    public function methodDatatable($collection = [])
    {
        $totalData = Model::count();

        $totalFiltered = $totalData;

        $datas = Model::offset($collection['start'])
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

    public function statusDatatable($collection = [])
    {
        $totalData = PaymentsStatus::count();
        $totalFiltered = $totalData;

        $datas = PaymentsStatus::skip($collection['start'])
            ->take($collection['length'])
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
        $paymentStatus = PaymentsStatus::where([
            "active" => 1
        ])->get();

        return $this->successResponse("success", $paymentStatus);
    }

    public function getActiveMethod()
    {
        $paymentMethod = Model::where([
            "active" => 1
        ])->get();

        return $this->successResponse("success", $paymentMethod);
    }

    public function createOrUpdate($collection = [])
    {
        $payment = Payments::updateOrCreate(["id" => $collection["id"] ?? null], [
            "active" => $collection['active'],
            "type" => $collection['type']
        ]);

        if ($payment){
            $languages = Languages::select('id', 'short_name')->get();
            foreach ($languages as $lang){
                $payment->languages()->updateOrCreate(['id_lang' => $lang->id, "id_payment" => $payment->id],[
                    'name' => $collection['name'][$lang->short_name] ?? null,
                    'key_title' => $collection['key_title'][$lang->short_name] ?? null,
                    'secret_title' => $collection['secret_title'][$lang->short_name] ?? null,
                ]);
            }
            return $this->successResponse("success", $payment);
        }
        return $this->errorResponse("error");
    }

    public function get($id)
    {
        $payment = Payments::with("languages.language")->firstWhere('id', $id);

        return $this->successResponse("success", $payment);
    }

    public function delete($id)
    {
        Payments::find($id)->delete();

        return $this->successResponse("success");
    }

    public function active()
    {
        $lang = $this->defaultLanguage();
        $payments = Payments::with([
            "language" => function ($query) use ($lang) {
                $query->where('id_lang', $lang->id);
            },
            "attributes.language" => function ($query) use ($lang) {
                $query->where('lang_id', $lang->id);
            }
            ])->whereActive(1)->get();

        return $this->successResponse("success", $payments);
    }

    public function datatable($collection = [])
    {
        $totalData = Payments::count();
        $length = $collection['length'] ?? null;
        $start = $collection['start'] ?? 0;

        $totalFiltered = $length > $totalData ? $totalData : $length;

        $lang = $this->defaultLanguage();
        $data = Payments::with([
            "language" => function ($query) use ($lang) {
                $query->where('id_lang', $lang->id);
            },
            "attributes.language" => function ($query) use ($lang) {
                $query->where('lang_id', $lang->id);
            }
        ])->when($length, function ($query) use ($start, $length) {
            $query->skip($start)
                ->take($length);
        })->orderByDesc('id')->get();

        $data = $data->map(function ($value){
            return collect($value)->merge([
                'options' => [
                    'delete' => 1,
                    'edit' => 1
                ]]);
        });

        return $this->responseJsonDatatable($totalData, $totalFiltered, $data);
    }

    /**
     * @param array $array
     * @return mixed
     */
    public function paymentAttributesSave($array = [])
    {
        $payment = Payments::find($array['payment_id']);

        if ($payment) {
            $attribute = $payment->attributes()->create([
                'tag' => $array['tag'],
                'position' => $array['position'] ?? 1,
                'mask' => $array['mask'] ?? null,
                'validation' => $array['validation'] ?? null,
                'active' => $array['active'] ?? 0,
            ]);

            $languages = Languages::select('id', 'short_name')->get();
            foreach ($languages as $lang) {
                $attribute->languages()->updateOrCreate(['lang_id' => $lang->id, "payment_attribute_id" => $payment->id], [
                    'name' => $array['name'][$lang->short_name] ?? null,
                ]);
            }
            return $this->successResponse("Payment Attribute Saved!", $attribute);
        }
        return $this->errorResponse("Payment not found!");
    }

    /**
     * @param $id
     * @return mixed
     */
    public function paymentAttributesGet($id)
    {
        $attribute = PaymentAttribute::with('languages')->find($id);

        if ($attribute) {
            $attribute = collect($attribute)->merge(['payment_name' => $attribute->payment->language->name]);

            return $this->successResponse("Payment Attribute found!", $attribute);
        }
        return $this->errorResponse("Payment Attribute not found!");
    }

    /* Set choose Payment by Type and top up (order, admin or client balance) */
    public function setPayment($array){
        $shopPayment = ShopPayment::with('payment')
            ->where(['id_shop' => $array['shop_id'], 'id_payment' => $array['payment_id']])->first();
        if ($shopPayment) {
            switch ($shopPayment->payment->tag){
                case 'stripe':
                    return (new StripeRepository())->stripePayment($array, $shopPayment->secret_id);
                case 'paystack':
                    return (new PaystackRepository())->paystackPayment($array, $shopPayment->secret_id);
                case 'terminal':
                case 'cash':
                    return $this->setTransaction($array);
                default:
                    return $this->errorResponse('Payment system not found');
            }
        }
        return $this->errorResponse('Shop Payment not found');
    }

    /* Create transaction when payment type CASH or TERMINAL */
    private function setTransaction($array){
        $result = Orders::firstWhere('id', $array['id']);
        if ($result) {
            $transaction = (new TransactionRepository())->createOrUpdate([
                'shop_id' => $array['shop_id'],
                'order_id'  => $result->id,
                'payment_sys_id'  => $array['payment_id'],
                'amount' => $result->total_amount,
                'status'  => 1,
                'status_description'  => 'In process',
            ]);
            return $this->successResponse('Transaction was created', ['transactionId' => $transaction->id]);
        }
        return $this->errorResponse('Order not found');
    }
}
