
# Lab 1 - Pokemon Google Map (continued - see README files for week 1 and 2 for directions #1-10)

Questions? 
email: croftd@itas.ca 
slack: croftd

UPDATED: Sept. 30th 2019 (Week 3)


## PART 11 ------------------------------------------------------------------------

__ getDamage()__

Each type of Pokemon will need to override the getDamage() function for each of the types of Pokemon to return the damage each does. So that we end up with the same results please use the following getDamage() functions:

```
// Bulbasaur:
  function getDamage() {
    return $this->getWeight()*0.3;
  }

// Pikachu:
  function getDamage() {
    return $this->getWeight()*1.5;
  }

// Paras:
  public function getDamage() {
    return $this->getWeight()*0.8;
  }

// Pidgey:
  function getDamage() {
        return $this->getWeight()*0.4;
  }

```

## PART 12 ------------------------------------------------------------------------

__ battle() function __

__Note - I've added a new file to the repository called index.php to help you test your battle function rather than running it through map.php and making AJAX calls. See index.php__

Modify your code in index.php to load the two pokemon files, and then loop through calling battle() ten times. If your battle function is programmed correctly it should end at round 8.

To complete the battle function, you will need to:

12.1 - Loop through the array of wild pokemon, and find which wild pokemon is closest to the trainer's latitude and longitude. You can use the World's built-in distance function to calculate the distance. For example:

```
$nearestWild = null;
$nearestDistance = 0;

foreach ($this->wildPokemon as $wild) {
    
    $distance = $this->distance($this->trainer->getLatitude(), $this->trainer->getLongitude(),
    $wild->getLatitude(), $wild->getLongitude());

    // the first time through, we will assume this distance is the closest one, as we haven't checked the others...
    if ($nearestWild == null) {
        $nearestWild = $wild;
        $nearestDistance = $distance;
    }

    // the next time through, you'll need an else if statement to check if the next $wild's distance is less than $nearestDistance, and if so set this as $nearestWild
  }
```

Reminder - to help debug your code you can pass messages back to the browser with the addMessage() function:

```
$this->addMessage("Found the next nearest wild pokemon: " . $wild->getName());
```

12.2 - After you find the next nearest wild pokemon, update the trainer and all of the trainer's pokemon to match the wild pokemon:

```
// update the Trainer and the Trainer's pokemon to these co-ordinates
$this->trainer->setLatitude($nearestWild->getLatitude());
$this->trainer->setLongitude($nearestWild->getLongitude());

foreach ($this->trainer->getPokemon() as $tPoke) {
    // same idea - update the lat/long for each of the trainer's $tPoke
    $tpoke->setLatitude($nearestWild->getLatitude()); 
    // etc...
}
```

11.3 - Now that you have found the nearest pokemon and moved the trainer to the same location, let the battle begin! Basically the idea is to let the trainer's first pokemon attach the wild pokemon, and if the wild pokemon survives the first attack, it gets to attack back. Use a loop to keep attacking back and forth until either the trainer's first pokemon dies, or the wild pokemon dies.

If the wild pokemon dies first (HP less than 0) - go back to 12.1 and search again for the next nearest pokemon.

If the trainer's first pokemon dies before the wild pokemon, use the trainer's second pokemon to attack the wild pokemon, and keep going back and forth until either one has HP less than 0. Note when one of the Trainer's pokemon has HP less than or equal to 0, remove this dead pokemon from the array containing the trainer's pokemon.

Here is some code to get you started:

```
foreach ($this->trainer->getPokemon() as $tPoke) {
            // attack the current wild pokemon
            $tPokeAlive = true;
            while ($tPokeAlive == true) {
                $tPoke->attack($nearestWild);
                $this->addMessage("Trainer_" . $tPoke->getName() . " attacked Wild_" . $nearestWild->getName() . " HP:" . $nearestWild->getHitPoints());

                // if $nearestWild has getHitPoint() > 0, then let the nearest wild attack $tPoke

                // etc. etc.. you will have to translate my directions above into working code!

```
Once you have battle() working in index.php, you should be able to go back to using map.php and making the AJAX calls. If you are getting warnings from PHP (check the console), you might need to turn off error reporting on the PHP server. In getPokemon.php adjust error_reporting() to turn off notices after the call to start the session:

```
session_start();

// required for some warning Notices in newer versions of PHP that mess up the JSON return
error_reporting(E_ERROR | E_WARNING | E_PARSE);

```

## PART 13 ------------------------------------------------------------------------

We need a better way to view the Trainer and the Trainer's pokemon collection. Modify the lat/long for each of the Trainer's pokemon so that they are offset by a few lat/long points to display on the google map in a staggered function. (see example on the board)

## PART 14 ------------------------------------------------------------------------


Add your own feature!

## PART 15 ------------------------------------------------------------------------

Submitting - please see the direction on portal for marking criteria, and how to submit (basically I will be pulling your git repository and trying to run your code...)

Please make sure you have the current version of index.php from the repository, as I will use this to test/evaluate your assignment (battle should end after 8 rounds).