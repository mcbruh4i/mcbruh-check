<?php
declare(strict_types=1);
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','cookie_secure'=>(!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'),'use_strict_mode'=>true]);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
function respond(int $status,string $message,bool $ok=false,array $extra=[]):never{http_response_code($status);echo json_encode(array_merge(['ok'=>$ok,'message'=>$message],$extra));exit;}
$configFile=__DIR__.'/config.php';
if(!is_file($configFile)) respond(503,'The site is not configured yet.');
$config=require $configFile;if(!is_array($config))respond(500,'Server configuration error.');
function db():PDO{static $db;if($db)return $db;$dir=__DIR__.'/storage';if(!is_dir($dir))mkdir($dir,0750,true);$db=new PDO('sqlite:'.$dir.'/leads.sqlite',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$db->exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');$db->exec('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE COLLATE NOCASE,phone TEXT NOT NULL,password_hash TEXT NOT NULL,last_login_at TEXT)');$db->exec('CREATE TABLE IF NOT EXISTS vehicle_requests(id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL,user_id INTEGER NOT NULL,vehicle TEXT NOT NULL,year INTEGER NOT NULL,mileage INTEGER NOT NULL,condition TEXT NOT NULL,ip_hash TEXT NOT NULL,status TEXT NOT NULL DEFAULT "new",FOREIGN KEY(user_id) REFERENCES users(id))');return $db;}
function csrf():string{if(empty($_SESSION['csrf']))$_SESSION['csrf']=bin2hex(random_bytes(32));return $_SESSION['csrf'];}
function requireCsrf():void{$token=(string)($_POST['csrf_token']??'');if(!$token||empty($_SESSION['csrf'])||!hash_equals($_SESSION['csrf'],$token))respond(403,'Your session expired. Refresh and try again.');}
function currentUser():?array{if(empty($_SESSION['user_id']))return null;$s=db()->prepare('SELECT id,name,email,phone FROM users WHERE id=?');$s->execute([(int)$_SESSION['user_id']]);$u=$s->fetch(PDO::FETCH_ASSOC);return $u?:null;}
function requireUser():array{$u=currentUser();if(!$u)respond(401,'Please sign in to continue.');return $u;}
