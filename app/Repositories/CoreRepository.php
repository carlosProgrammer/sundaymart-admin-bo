<?php

namespace App\Repositories;

use App\Models\Admin;
use App\Models\Languages;

abstract class CoreRepository
{
    protected $model;

    /**
     * CoreRepository constructor.
     */
    public function __construct()
    {
        $this->model = app($this->getModelClass());
    }

    abstract protected function getModelClass();

    protected function startCondition(){
        return clone $this->model;
    }

    public function defaultLanguage(){
        return Languages::firstWhere('default', 1);
    }

    public function getTotal($shop){
        $shop_id = Admin::getUserShopId();
        if ($shop_id == -1) {
            if (isset($shop))
                $totalData = $this->startCondition()->where("shop_id", $shop)->count();
            else
                $totalData = $this->startCondition()->count();
        } else {
            if (isset($shop))
                $totalData = $this->startCondition()->where("shop_id", $shop)->count();
            else
                $totalData =  $this->startCondition()->where("shop_id", $shop_id)->count();
        }

        return $totalData;
    }
}
