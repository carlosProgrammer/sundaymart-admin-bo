<?php

namespace App\Repositories\Interfaces;

interface TransactionInterface
{
    public function createOrUpdate($array, $id = null);

    public function shopTransactions($shop_id, $params);

    public function clientTransactions($client_id, $params);
}
