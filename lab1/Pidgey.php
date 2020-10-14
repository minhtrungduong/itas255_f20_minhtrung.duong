<?php


class Pidgey extends Pokemon implements Flyer
{
    protected $isFlying;
    protected $speed;
    protected $direction;


    function __construct($weight, $hp, $latitude, $longitude)
    {
        parent::__construct("Pidgey", "pidgey.png", $weight, $hp, $latitude, $longitude, "flying");
        $this->speed = 50;
        $this->isFlying = true;
        $this->direction = 50;
    }


    function getDamage()
    {
        return $this->getWeight() * 0.4;
    }

    function takeOff()
    {
        $this->isFlying = true;
    }

    function land()
    {
        $this->isFlying = false;
    }

    function getFlying()
    {
        if ($this->isFlying) {
            return true;
        } else {
            return false;
        }
    }

    function getSpeed()
    {
        return $this->speed;
    }

    function getDirection()
    {
        return $this->direction;
    }
}