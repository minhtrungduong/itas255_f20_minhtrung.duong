<?php


abstract class Character
{
    private $name;
    private $image;
    private $latitude;
    private $longtitude;


    public function __construct($name, $image, $latitude, $longtitude)
    {
        $this->name = $name;
        $this->image = $image;
        $this->latitude = (float)$latitude;
        $this->longtitude = (float)$longtitude;
    }

    /**
     * @return mixed
     */
    public function getName()
    {
        return $this->name;
    }

    /**
     * @return mixed
     */
    public function getImage()
    {
        return $this->image;
    }

    /**
     * @return float
     */
    public function getLatitude()
    {
        return $this->latitude;
    }

    /**
     * @param float $latitude
     */
    public function setLatitude($latitude)
    {
        $this->latitude = $latitude;
    }

    /**
     * @return float
     */
    public function getLongtitude()
    {
        return $this->longtitude;
    }

    /**
     * @param float $longtitude
     */
    public function setLongtitude($longtitude)
    {
        $this->longtitude = $longtitude;
    }

    public function getJSON() {
        // needs to return something like:
        // {"lat":  49.159720,"long":  -123.907773,"name": "Paras","image": "paras.png" }
        $json = '{"lat": ' . $this->latitude;
        $json .= ',"long": ' . $this->longtitude;
        $json .= ',"name":" ' . $this->name;
        $json .= '", "image":"' . $this->image.'"}';
        return $json;
    }



}