<?php

namespace App\Repositories\Payment;

use App\Models\Orders;
use App\Models\ShopPayment;
use App\Models\Transaction as Model;
use App\Repositories\BalanceRepository;
use App\Repositories\CoreRepository;
use App\Repositories\Interfaces\Payment\PaystackRepoInterface;
use App\Repositories\TransactionRepository;
use App\Traits\ApiResponse;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Http;

class PaystackRepository extends CoreRepository implements PaystackRepoInterface
{
    private $shop;
    use ApiResponse;

    public function __construct()
    {
        parent::__construct();

    }

    protected function getModelClass()
    {
        return Model::class;
    }

    public function createTransaction($array, $key)
    {

        $headers = ['Authorization' => 'Bearer '.$key, 'Content-Type' => 'application/json'];
        $params = [
            "amount" => $array['amount'] * 100,
            "email" => $array['email'] ?? " "
        ];

        $response = Http::withHeaders($headers)->post('https://api.paystack.co/transaction/initialize', $params);
        return json_decode($response->body());

    }

    public function verifyTransaction($array)
    {
        $key = [];
        $client = new Client([
            'headers' => [
                'Authorization' => $key->secret_id,
                'Content-Type' => 'application/json',
            ]
        ]);

        $response = $client->get('https://api.paystack.co/transaction/verify/' . $array['transaction_id']);

        return $this->successResponse('Transaction found', $response);
    }

    public function listTransactions()
    {
        // TODO: Implement listTransactions() method.
    }

    public function fetchTransaction()
    {
        // TODO: Implement fetchTransaction() method.
    }


    public function paystackPayment($array, $key)
    {
        switch ($array['type']){
            case 'order':
                $result = Orders::firstWhere('id', $array['id']);
                if (!$result) {
                    return $this->errorResponse('Order not found');
                }
                $amount = $result->total_sum;
                $order_id = $array['id'];
                break;
            case 'admin':
                $result = (new BalanceRepository())->getUsersBalance(['type' => 'admin', 'id' => $array['id']]);
                $amount = $array['amount'];
                $admin_id = $array['id'];
                break;
            case 'client':
                $result = (new BalanceRepository())->getUsersBalance(['type' => 'client', 'id' => $array['id']]);
                $amount = $array['amount'];
                $client_id = $array['id'];
                break;
            default: $result = null;
        }

        if ($result){
            $payment = $this->createTransaction($array + ['amount' => $amount], $key);
            if (isset($payment->status) && $payment->status == 'succeeded') {
                $transaction = (new TransactionRepository())->createOrUpdate([
                    'shop_id' => $array['shop_id'],
                    'client_id' => $client_id ?? null,
                    'admin_id' => $admin_id ?? null,
                    'order_id'  => $order_id ?? null,
                    'payment_sys_trans_id'  => $payment->data->reference ?? null,
                    'payment_sys_id'  => $array['payment_id'],
                    'amount' => $amount,
                    'status'  => 1,
                    'status_description'  => 'In process',
                ]);
                if ($transaction) {
                    return $this->successResponse('Success', ['redirect_url' => $payment->data->authorization_url]);
                } else {
                    return $this->errorResponse('Transaction failed');
                }
            } else {
                return $payment;
            }
        } else {
            return $this->errorResponse('Undefined TYPE');
        }
    }

}
