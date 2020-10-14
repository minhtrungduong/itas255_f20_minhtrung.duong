<?php


interface Flyer
{

    function takeOff();

    function land();

    function getFlying(); // return true or false if flying

    function getSpeed();

    function getDirection();
}