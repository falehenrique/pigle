<?php

header("Content-Type: text/event-stream\n\n");

$counter = 0;

while ( true ) {

  $message_pool = array(
          "executeSE",
          "getSEImplementedMethods",
          "whatever",
          "something useless",
          "or something even more useless"
  );

  // Every second, sent a "ping" event.
  $message = $message_pool [  $counter % sizeof ( $message_pool ) ];

  echo "event: " . $message . "\n";

  //echo 'data: ' . '{"serviceId" : "SE_START","input" : [{"tag" : "0x9F02","length" : 6,"data" : "20000"},{"tag" : "0x5F2A","length" : 2,"data" : "0978"},{"tag" : "0x5F36","length" : 1,"data" : "02"},{"tag" : "0x9F948919","length" : 4,"data" : "C8"},{"tag" : "0x9F948900","length" : 4,"data" : "C8"}]}';
  echo 'data:' . '{"serviceId" : "SE_END","input" : [{"data": "0000016E", "length": 4, "tag": "0x9F94891D"}]}';
  echo "\n\n";

  $counter = ( $counter + 1 ) % sizeof ( $message_pool );
    
  ob_flush();
  flush();
  sleep(5);
}

?>