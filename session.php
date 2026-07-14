<?php
declare(strict_types=1);require __DIR__.'/bootstrap.php';if($_SERVER['REQUEST_METHOD']!=='GET')respond(405,'Method not allowed.');respond(200,'Session ready.',true,['authenticated'=>currentUser()!==null,'user'=>currentUser(),'csrf'=>csrf()]);
