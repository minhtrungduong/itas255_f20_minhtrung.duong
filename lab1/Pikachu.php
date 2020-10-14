<?php

require_once 'Pokemon.php';

class Pikachu  extends Pokemon
{
    function __construct($weight, $hp, $latitude, $longtitude) {
        parent::__construct("Pikachu", "pikachu.png", $weight, $hp, $latitude, $longtitude, "grass");
    }

    function getDamage() {
        return $this->getWeight()*1.5;
    }
}