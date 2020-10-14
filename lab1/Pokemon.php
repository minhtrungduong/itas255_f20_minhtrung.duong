<?php




abstract class Pokemon extends Character
{
    protected $name;
    protected $image;

    //protected $damage;
    protected $weight;
    protected $HP;
    protected $latitude;
    protected $longtitude;
    protected $type;


    public function __construct($name, $image, $weight, $HP, $latitude, $longtitude, $type)
    {
        parent::__construct($name, $image, $latitude, $longtitude);

        $this->weight = $weight;
        $this->HP = $HP;
        $this->type = $type;
    }

    /**
     * @return mixed
     */
    public function getWeight()
    {
        return $this->weight;
    }

    /**
     * @return mixed
     */
    public function getHP()
    {
        return $this->HP;
    }

    /* public function getDamage()
    {
        return $this->damage;
    } */

    /**
     * @return mixed
     */
    public function getType()
    {
        return $this->type;
    }

    public function __toString()
    {
        try {
            return (string)$this->name . " Weight:" . (string)$this->weight . " HP:" . $this->HP . " Type:" . $this->type . " latitude" . $this->latitude . " Longtitude" . $this->longtitude;
        } catch (Exception $exception) {
            return $exception->getMessage();
        }
    }

    public function getJSON()
    {
        $json['lat'] = $this->getLatitude();
        $json['long'] = $this->getLongtitude();
        $json['name'] = $this->getName();
        $json['image'] = $this->getImage();
        return json_encode($json);
    }

    public function attack(Pokemon $other)
    {
        // the other pokemon's hitpoints will be reduced by the amount of
        // damage the current pokemon ($this) can inflict
        $other->HP = $other->HP - $this->getDamage();
    }

    abstract public function getDamage();
}