<?php 
session_start();

error_reporting(E_ERROR | E_WARNING | E_PARSE);

// Simple test script to test loading pokemon from files and 
// the getJSON() function
// croftd: modified to loop through and test the battle function
// 
function __autoload ($class_name) {
	require_once $class_name . '.php';
}
//
//$trainer = new  Trainer('toba');
//
//$bulbasar_1 = new Bulbasaur('50 kg',20, 36.002525,-95.883797);
//$bulbasar_2 = new Bulbasaur('40 kg',20, 40.002525,-90.883797);
//$bulbasar_3 = new Bulbasaur('32 kg',20, 40.002525,-80.883797);

//$pichaku_1 = new  Pikachu('40 kg',20, 30.002525,-92.883797);

//$paras_1 = new Paras('50 kg',20, 36.002525,-95.883797);
//$paras_2 = new Paras('40 kg',20, 40.002525,-90.883797);
//$paras_3 = new Paras('32 kg',20, 40.002525,-80.883797);


//$trainer->add($bulbasar_1);
//$trainer->add($bulbasar_2);
//$trainer->add($bulbasar_3);
//$trainer->add($pichaku_1);
//$trainer->add($paras_1);
//$trainer->add($paras_2);
//$trainer->add($paras_3);

//$trainer->printAll();
//echo '<br><br><br>';
////$trainer->attackAll();
////var_dump($trainer);
//die;
$world = World::getInstance();
$world->addMessage("Hello from stuff happening on the server");
//
echo "<br>Loading pokemon from the two text files...<br>";
//
$loadedPokemon = $world->load();

//
$i = 0;

echo "<br>Starting looping through to test the world battle function!<br>";
for ($i=1; $i <= 10; $i++) {

	echo "<br>Round[" . $i . "] Here is the current JSON:<br>";
	echo "<pre>";
	echo $world->getJSON();
	echo "</pre>";

    echo "<br>Round[" . $i . "] battle()";
    $world->battle();
	echo "<br>Round[" . $i . "]  messages from the world: " . $world->getMessage();
	$world->clearMessage();

}