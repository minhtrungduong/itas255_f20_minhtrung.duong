
# Lab 1 - Pokemon Google Map (continued WEEK 2)

Questions? 
email: croftd@itas.ca 
discord: @croftd

Sept. 16th 2020

## PART 5 ------------------------------------------------------------------------

__ Make the Pokemon class abstract __

Write an abstract getDamage() function

In each of the child classes (Bulbasaur, Paras etc..), override the getDamage function to return a number value (Bulbasaur might return 2, Paras return 3 etc...). I will be giving you specific values to return in Week 3 or Week 4. The intention for now is that each subtype of Pokemon has a unique damage returned.

Modify Pokemon's attack method to accept a Pokemon parameter, and reduce the others hitpoints:

```
  // note I am type hinting to ensure $other is actually a Pokemon object
	function attack(Pokemon $other) {
    // the other pokemon's hitpoints will be reduced by the amount of 
    // damage the current pokemon ($this) can inflict
		$other->HP = $other->HP - $this->getDamage();
	}
```

---

## PART 6 ------------------------------------------------------------------------

__ Flyer Interface and Pidgey class __

Write an Interface called Flyer, this should have the following functions declared:

```
	function takeOff();

	function land();

	function getFlying(); // return true or false if flying

	function getSpeed();

	function getDirection();
```

Write a new Pokemon class called Pidgey, this class should also inherit from Pokemon

Modify the Pidgey class to implement the Flyer interface (you will need to define the five methods from the interface). In order to be useful (to the extent that this lab could be...), you will need to add some fields to the Pidgey class. For example, you can store fields in the Pidgey class for:

	$isFlying; // to remember if currently on land or taken off, and return this from takeOff() and land()
	$speed;  // remember current speed - can just be some number for now
	$direction; // remember current direction - can just be some number for now

You will then use the fields when writing the functions from the Flyer interface, for example:

```
function getSpeed() {
  return $this->speed;
}
```
And the Pidgey class will look like:

```
class Pidgey extends Pokemon implements Flyer {

  private $speed;

  public function __construct($weight, $hp, $lat, $long, $speed) {
    parent::__construct('Pidgey', 'pidgey.png', $weight, $hp, $lat, $long, 'flying');
    $this->speed = $speed;

    // Note this adds support just for speed, you will also need $isFlying, $direction etc..
  }

}
```

## PART 7 ------------------------------------------------------------------------

__ Refactoring Pokemon and Trainer with a common base class __

I will discuss this step in greater depth in the next class. We are going to 
write a new abstract Character class and move any variables that are common between Trainer
and Pokemon into this class - we are trying to eliminate anything repetitive between classes.

Pokemon class should be refactored to use the new abstract Character as the base class

Move some fields/methods not unique to Pokemon to the Character class (e.g. name, lat, long, image etc..)

Note if done properly, you shouldn’t need to modify your other Pokemon classes (Pidgey etc..)

Trainer class
  Trainer should extend Character in order to have support for lat, long etc..



## PART 8 ------------------------------------------------------------------------

__ World.php __

World class
	Should be a Singleton (see slides from week 2) - this should already be completed for you but understand how it works!
	public static function getInstance()
	Contain one Trainer
	Contain an array of Wild Pokemon ($wildPokemon - currently this array can be blank)
	Should store a string called jsonMessage
	addMessage() // add a String to the current message 			 //queue to be sent back with JSON
	getMessage()  // return the current jsonMessage
	clearMessage() // reset the current jsonMessage

	Method getJSON() that returns the valid JSON to represent a marker for each of the wild pokemon, the trainer, the trainer’s pokemon and the current "message" to send back - see directions to support his below in Part 10


## PART 9 ------------------------------------------------------------------------

__ LOAD FILES __

I put two text files on the portal that contain a list of ’Wild Pikachu’ and a list of Pikachu for the trainer's array to contain.

Write a method in the World - loadPokemon($filename) that takes a filename as a parameter, reads in the file(), and depending and creates a Pokemon for each pokemon description in the file. This function should return an array

Call loadPokemon("wildPokemon.txt") to set the array in the World
Call loadPokemon("trainerPokemon.txt") to set the array in the Trainer (the World class should contain one Trainer object)

## PART 10 ------------------------------------------------------------------------

__ Generate JSON __

Write the getJSON methods for Character, Trainer, World such that when you call World::getInstance()->getJSON() it returns a JSON string that looks something like the one I currently have hard-coded in World.php, but has the data from the actual Pokemon and Trainer in the World. To do this you will need to loop through all the wildPokemon array in the world, and for each pokemon create a JSON string, get all the trainers pokemon/loop through them and make json strings, and add a json object for the trainer.

In the Pokemon class, write a method called getJSON that returns the info (name, lat, long, image) for this object as a JSON String (currently the returned from World.php is hard-coded as a big string). 

NOTE: You will have to carefully reverse engineer what I have hard-coded as a JSON String in World.php
to actually use the lat, long, image etc. from each Pokemon class. The client (in the case the JavaScript in map.php is expecting each marker will have JSON data for name, lat, long and image).

The getJSON method in the Pokemon class should return something like (including the quotes!):

```
{"lat":  49.159720,"long":  -123.907773,"name": "Paras","image": "paras.png" }

```

Similar to the Pokemon class, Trainer should also have a getJSON() method.
  getJSON() should return a JSON String with the Trainer's lat, long, name and image, and a String for each Pokemon that the Trainer has in their collection. The Trainer's String and each Pokemon should be seperated by a comma. For example, it will look something like:

  {"lat":  49.159750,"long":  -123.907723,"name": "Ash","image": "ash.png" }, 
  {"lat":  49.159720,"long":  -123.907763,"name": "Bulbasaur","image": "bulbasaur.png" },
  {"lat":  49.159620,"long":  -123.907763,"name": "Paras","image": "paras.png" }

Once you have completed a getJSON method in the Pokemon and Trainer class, complete the getJSON() method in World.php
It should loop through all the wild pokemon and add these as a set of markers, and then call the Trainer's getJSON method
to add the marker for the Trainer and all his/her Pokemon.

The complete JSON string returned by calling $world->getJSON() will look something like:

'{
  "markers": [
    {
      "lat": 49.159706,
      "long": -123.905757,
      "name": "Trainer",
      "image": "trainer.png"
    }, {
      "lat": 49.159706,
      "long": -123.907757,
      "name": "bulbasaurT",
      "image": "bulbasaur.png"
    },{
      "lat": 49.159836,
      "long": -123.908857,
      "name": "parasT",
      "image": "paras.png"
    },{
      "lat": 49.159966,
      "long": -123.903657,
      "name": "pikachuT", 
      "image": "pikachu.png"
    },{
      "lat": 49.159720,
      "long": -123.907773,
      "name": "paras1", 
      "image": "paras.png"
    },{
      "lat": 49.171154,
      "long": -123.971443,
      "name": "pidgey1", 
      "image": "pidgey.png"
    },{
      "lat": 49.152864,
      "long": -123.94873,
      "name": "paras2", 
      "image": "paras.png"
    },{
      "lat": 49.1350026,
      "long": -123.9220046,
      "name": "paras3", 
      "image": "paras.png"
    },{
      "lat": 49.178561,
      "long": -123.857631,
      "name": "bulb1", 
      "image": "bulb.png"
    },{
      "lat": 49.162736,
      "long": -123.892478,
      "name": "bulb2", 
      "image": "bulb.png"
    },{
      "lat": 49.1790103,
      "long": -123.9199447,
      "name": "pidgey2", 
      "image": "pidgey.png"
    },{
      "lat": 49.1675630,
      "long": -123.9383125,
      "name": "pidgey2", 
      "image": "pidgey.png"
    }
  ],
  "message": "Attack counter is: ' . $_SESSION['counter']  . ' " 
  }
'

Note: "messsage" is the final key-value pair returned from the World to map.php. It is a simple mechanism to allow us to send messages from the World to be displayed in the browser... to help debug code or send messages from your server-side scripts you can call:

$world = World::getInstance();
$world->addMessage("Hello from stuff happening on the server");

If you look in the getPokemon.php script, the message is cleared at the end of this file, so that we only get new messages each time we call getPokemon.php().


