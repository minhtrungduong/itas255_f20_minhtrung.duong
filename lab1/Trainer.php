<?php

require_once('Pokemon.php');


class Trainer extends Character
{
    public $pokedex;
    private $trainerName;


    public function __construct($trainerName)
    {
        $this->trainerName = $trainerName;
        $this->pokedex = [];
    }

    function add($pokemon)
    {
        array_push($this->pokedex, $pokemon);
        //$this->poked[] = $character . " , ";
    }

    function printAll()
    {
        foreach ($this->pokedex as $value){
            echo $value ." , ";
            echo '<br>';
        }
        //print_r($this->poked ). '<br>';
    }

    function attackAll()
    {
        foreach ($this->pokedex as $pokemon){
             echo  $pokemon->attack(). '<br>';
        }
        //print_r($this->poked ). '<br>';
    }

    function getJSON(){
        $json = [];
        $json['lat'] = $this->getLatitude();
        $json['long'] = $this->getLongtitude();
        $json['trainerName'] = $this->getName();
        $json['image'] = $this->getImage();
        $json['markers'] = [];
        foreach ($this->pokedex as $pokemon){
            $json['markers'][] =[
                'lat' => $pokemon->getLatitude(),
                'long' => $pokemon->getLongtitude(),
                'name' => $pokemon->getName(),
                'image' => $pokemon->getImage(),
            ];
        }
        return json_encode($json);
    }

    public function getPokemon()
    {
        return $this->pokedex;
    }

}