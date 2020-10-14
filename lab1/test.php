<?php


error_reporting(E_ERROR | E_WARNING | E_PARSE);

function __autoload ($class_name) {
	require_once $class_name . '.php';
}

$classes = get_declared_classes(); 

foreach($classes as $class) {
  echo $class . "<br>";
}

echo "</br>"; 
echo $print -> printAll();
echo "</br>";
echo $attack->attackAll();
?>