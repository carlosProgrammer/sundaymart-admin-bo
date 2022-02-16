<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Repositories\Interfaces\Payment\PaystackRepoInterface;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Paystack;
use Redirect;
use URL;

class PaystackController extends Controller
{
    use ApiResponse;
    private $paystackRepository;

    /**
     * @param PaystackRepoInterface $PaystackRepository
     */
    public function __construct(PaystackRepoInterface $paystackRepository)
    {
        $this->paystackRepository = $paystackRepository;
    }

    public function verifyTransaction(Request $request){

        return $this->paystackRepository->verifyTransaction($request->all());
    }
}
