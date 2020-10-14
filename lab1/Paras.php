<?php

require_once 'Pokemon.php';

class Paras extends Pokemon
{
    function __construct($weight, $hp, $latitude, $longtitude) {
        parent::__construct("Paras", 'paras.png', $weight, $hp, $latitude,$longtitude, "grass");
    }

    public function getDamage() {
        return $this->getWeight()*0.8;
    }
}
