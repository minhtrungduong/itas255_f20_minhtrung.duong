# Lab 1 - Pokemon Google Map

Questions? 
email: croftd@itas.ca 
slack: croftd

Sept. 9th 2020

## PART 1 ------------------------------------------------------------------------

Note we are using a .md file so that I can use git-style markup to format this file if you are reading it in your browser on gitlab. For example here is a line of code:

```
$example = new GitMarkdown();
```
Directions (for Week 1 and Week 2): 

Create a Pokemon class (in the file Pokemon.php)
	This class should have the following private fields:
			Name, image, weight, HP, latitude, longitude, type
	Write methods to get each of the fields, and setters for latitude and longitude (the other fields should only be set initially by the constructor)
	Write a __toString() method that returns a String containing information from all the fields. For example:
	“Bulbasaur Image:bulbasaur.jpg Weight:35 HP:20 Type:Grass latitude:49.134 longitude: 123.456”
	Write an attack method that echos out “Base class, no attack”

Create a Bulbasaur class (in a file called Bulbasaur.php)
	Bulbasaur should inherit from Pokemon (manually import the Pokemon class with require_once)
	The constructor for Bulbasaur should only take weight, HP, latitude, longitude – name should be set to “Bulbasaur”, type should be set to “grass”, and image set to “bulbasaur.jpg” – see the slides above about calling the parent class constructor. For example:

 	function __construct($weight, $hp, $latitude, $longitude) {
        parent::__construct("Bulbasaur", "bulbasaur.jpg", $weight, $hp, $latitude, $longitude, "grass");
    }

	Override the attack method to print out “Bulbasuar attacking!!”

## PART 2 ------------------------------------------------------------------------

Similar to Bulbasaur, create a Pikachu and Paras class that inherit from the Pokemon class – these should each have unique attack methods that print out something different

## PART 3 ------------------------------------------------------------------------

Create a Trainer class (in Trainer.php)
Manually import the Pokemon class with require_once (this is the only class Trainer needs to be aware of)
This class should have the following fields:
	An array to store pokemon (you might call this $pokedex)
	A String to store a name

Write a constructor for Trainer that accepts a single parameter for the name of the trainer and initializes the array to store Pokemon objects

Write an add() method that accepts a Pokemon parameter (use type hinting) and this method should add the passed Pokemon to the array

Write a method called printAll(), that loops through all the Pokemon objects stored in the array and echos these out in a readable format – use HTML markup as necessary for line breaks etc.. If you want to get fancy you could format these in an HTML table, add bootstrap CSS, and output some img tags with sample images found from the Internet (e.g. ```<img src="bulbasaur.png" alt="bulbasaur pic">```)

Write a method called attackAll(), that loops through all the Pokemon and calls the attack() method upon each object retrieved while iterating through – this is Polymorpishm!


## PART 4

Create an index.php file
Use the __autoload statement from the slides above to import all our Pokemon classes
Create a Trainer object
Instantiate 3 Bulbasaur, 1 Pikachu and 3 Paras Pokemon, and add these to the Trainer
Call the printAll() method on the Trainer object
Call the attackAll() method on the Trainer object

See what classes PHP has loaded into memory – try the following code (you can comment this out later):

$classes = get_declared_classes(); 

foreach($classes as $class) {
  echo $class . "<br>";
}