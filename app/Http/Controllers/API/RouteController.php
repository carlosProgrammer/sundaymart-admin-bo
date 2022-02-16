<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DeliveryRoute;
use App\Models\LiveTracking;
use App\Models\Orders;
use App\Repositories\Interfaces\OpenRouteInterface;
use App\Traits\ApiResponse;
use App\Transformers\DeliveryRouteTransformer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RouteController extends Controller
{
    use ApiResponse;
    private $openRoute, $deliveryRoute, $liveTracking, $order;

    public function __construct(OpenRouteInterface $openRouteRepository, DeliveryRoute $deliveryRoute, LiveTracking $liveTracking, Orders $order)
    {
        $this->openRoute = $openRouteRepository;
        $this->deliveryRoute = $deliveryRoute;
        $this->liveTracking = $liveTracking;
        $this->order = $order;
    }

    /**
     * Returns a route between two or more locations with delivery price
     * @param Request $request
     * @return JsonResponse
     */
    public function setDeliveryRoute(Request $request): JsonResponse
    {
        $route = $this->deliveryRoute->firstWhere('order_id', $request->order_id);
        if ($route) {
            return $this->successResponse('Route already created', (new DeliveryRouteTransformer)->transform($route));
        }

        $origin = explode(',', $request->origin_address);  // Преобразование строки исходного места в массив
        $destination =  explode(',', $request->destination_address);  // Преобразование строки места назначения в массив

        $response = $this->openRoute->getDirections($request->type ?? 'driving-car', $origin, $destination);

        if (isset( $response->features[0])) {
            // Set delivery price for delivery route
            $deliveryPrice = $this->setDeliveryPrice($request->order_id, $response->features[0]->properties->segments[0]->distance);

            $deliveryRoute = $this->deliveryRoute->updateOrCreate(['order_id' => $request->order_id], [
                'origin_address' => $request->origin_address,
                'destination_address' => $request->destination_address,
                'distance' => $response->features[0]->properties->segments[0]->distance,
                'duration' => $response->features[0]->properties->segments[0]->duration,
                'price' => $deliveryPrice,
                'type' => $request->type ?? 'driving-car',
                'properties' => $response->features[0]->geometry,
            ]);
            $deliveryRoute->order()->update(['delivery_fee' => $deliveryRoute->price]);

            return $this->successResponse('Route has been created', (new DeliveryRouteTransformer)->transform($deliveryRoute));
        }
        return $this->errorResponse($response->error);
    }

    /**
     * The method returns the remainder of the Delivery route length by "order_id"
     * @param Request $request
     * @return JsonResponse
     */
    public function getDeliveryRouteLength(Request $request): JsonResponse
    {
        $order =  Orders::with('deliveryRoute')->find($request->order_id);
        if ($order) {
            $deliveryBoyCoordinates = $this->liveTracking->where('admin_id', $order->id_delivery_boy)->pluck('coordinates');

            if (count($deliveryBoyCoordinates) > 0) {
                $origin =  explode(',', $deliveryBoyCoordinates[0]);  // Преобразование строки места назначения в массив
                $destination =  explode(',', $order->deliveryRoute->destination_address);  // Преобразование строки места назначения в массив

                $result = $this->openRoute->getDirections($order->deliveryRoute->type, $origin, $destination);

                if ($result && isset($result->features[0])) {
                    $deliveryRoute = [
                          'id' => $order->deliveryRoute->id,
                          'order_id' => $order->deliveryRoute->order_id,
                          'origin' => $deliveryBoyCoordinates[0],
                          'destination' => $order->deliveryRoute->destination_address,
                          'distance'    => $this->deliveryRoute->setMeterToKilometer($result->features[0]->properties->segments[0]->distance) . ' km',
                          'duration'    => $this->deliveryRoute->setSecondsToMinute($result->features[0]->properties->segments[0]->duration) . ' min',
                          'properties'   => $result->features[0]->geometry[0]
                    ];

                    return $this->successResponse('Delivery route length', $deliveryRoute);
                } else {
                    return $this->errorResponse($result->error);
                }
            }
            return $this->errorResponse(['code' => 404, 'message' => 'Client coordinates not found']);
        }
        return $this->errorResponse(['code' => 404, 'message' => 'Order not found']);
    }

    /**
     * Method matched GET and POST request and save or find clients coordinates
     * if request GET method find client last coordinates by client_id
     * if request POST method save or update client coordinates
     * @param Request $request
     * @return JsonResponse
     */
    public function adminLiveTracking(Request $request): JsonResponse
    {
        if ($request->method() == 'GET') {
            $result = $this->liveTracking->firstWhere('admin_id', $request->id);
            if ($result) {
                return $this->successResponse('Found last coordinates', $result);
            }
            return $this->errorResponse(['code' => 404, 'message' => 'Client coordinates not found']);
        }

        $result = $this->liveTracking->updateOrCreate(['admin_id' => $request->id], [
            'coordinates' => $request->coordinates
        ]);

        if ($result) {
            return $this->successResponse('Client coordinates was successfully saved', $result);
        }
        return $this->errorResponse('Error during saving');
    }

    /**
     * Method calculate delivery route price
     * @param $order_id
     * @param $distance
     * @return float|int
     */
    private function setDeliveryPrice($order_id, $distance)
    {
        // Find order by "order_id" with relations shop
        $order = $this->order->with('shop', 'shop.shopDeliveries')->find($order_id);
        $delivery = $order->shop->shopDeliveries->find($order->delivery_fee);

        // convert distance OpenRoute service from meter to kilometer
        $distance = $this->deliveryRoute->setMeterToKilometer($distance);

        if (count($order->shop->shopDeliveries) > 0) {
            $shopDeliveries = $order->shop->shopDeliveries->where('type', 1);
            if (count($shopDeliveries) > 0) {
                $shopDelivery = $order->shop->shopDeliveries->where('start', '<=', $distance)
                    ->where('end', '>=', $distance)->first();

                if (!$shopDelivery) {
                    $shopDelivery = $order->shop->shopDeliveries->where('end', 0 ?? null)->first();

                    if (!$shopDelivery) {
                        return 0;
                    }
                }
                return $distance * $shopDelivery->amount;
            } else {
                return $delivery->amount;
            }
        }
        return 0;

    }
}
