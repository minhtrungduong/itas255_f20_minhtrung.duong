
<?php
class Superpower {

    private $description;
    private $damage;

    public function __construct($desc, $damage) {
        $this->description = $desc;
        $this->damage = $damage;
    }

    public function __tostring() {
        return " ( " . " Superpower: " . $this->description . ", Damage: " . $this->damage . " )";
    }
}

?>