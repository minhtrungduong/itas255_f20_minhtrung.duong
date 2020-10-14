<?php

require_once 'Pokemon.php';

class Bulbasaur extends Pokemon
{
    public function __construct($weight, $hp, $latitude, $longtitude)
    {
        parent::__construct('Bulbasaur', 'bulbasaur.png',$weight, $hp, $latitude, $longtitude, 'grass');

    }

    public function getDamage()
    {
        return $this->getWeight()*0.3;
    }

}