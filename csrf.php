<?php
declare(strict_types=1);require __DIR__.'/bootstrap.php';if($_SERVER['REQUEST_METHOD']!=='GET')respond(405,'Method not allowed.');respond(200,'Token ready.',true,['token'=>csrf(),'authenticated'=>currentUser()!==null,'user'=>currentUser()]);
