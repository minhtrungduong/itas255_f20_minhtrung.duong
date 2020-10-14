<?php
session_start();

/**
 * croftd: Start of script to create the Pokemon World, and send the list of Pokemon back to the caller
 * This is the bootstrap that handles the SESSION and autoloading etc...
 * Updated: 2019-09-08
 */

/**
 * Define magic PHP function to load classes automatically
 */
function __autoload ($class_name) {
	require_once $class_name . '.php';
}

// assume we want to continue with the current session (World increments with a counter - the Reset link clears this!)
$reset = false;
if (isset($_GET['reset'])) {
    $reset = true;
}

// variable we will either initialize or retrieve from the current SESSION
$world = null;

if (!isset($_SESSION['counter']) || $reset == true) {
    $_SESSION['counter'] = 0;

    // setup World in the session
    World::reset();
    // get the new blank instance
    $world = World::getInstance();

    try {
        // load the pokemon from files (not implemented for Week 1)
        $world->load();
        $world->addMessage("Loaded pokemon from files");
    } catch (Exception $e) {
        $world->addMessage("Failed to load pokemon from files");
    }

    // store this World object into the SESSION
    $_SESSION['world'] = $world;

} else {
    $_SESSION['counter'] = $_SESSION['counter'] + 1;

    // get the World and 'iterator' through another round of action
    $world = $_SESSION['world'];


}

// Only start battling after first round
if ($_SESSION['counter'] > 1) {
    $world->battle();
}

// Now we need to send valid JSON back!
// If the JSON is not valid we will get the:
// "error parsererror" message in Chrome's JavaScript console

echo $world->getJSON();

//World::getInstance()->addMessage("The cat went out");

// now clear the current messages!
$world->clearMessage();
