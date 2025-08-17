<?php
// status.php - API da Rádio HabbLive
// ------------------------------------------------------------
// Retorna JSON com os dados da rádio no formato esperado
// ------------------------------------------------------------

// === HEADERS (CORS + JSON) ===
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// === CONFIG ===
$SC_BASE = 'http://sonicpanel.oficialserver.com:8342'; // Shoutcast v1 base

// === Helpers ===
function http_get_bytes($url, $timeout = 5) {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_CONNECTTIMEOUT => $timeout,
      CURLOPT_TIMEOUT        => $timeout,
      CURLOPT_USERAGENT      => 'Mozilla/5.0 (StatusPHP)',
      CURLOPT_SSL_VERIFYPEER => false,
      CURLOPT_SSL_VERIFYHOST => false,
    ]);
    $data = curl_exec($ch);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($data === false) throw new Exception("cURL: $err");
    return $data;
  } else {
    $ctx = stream_context_create(['http' => ['timeout' => $timeout, 'header' => "User-Agent: StatusPHP\r\n"]]);
    $data = @file_get_contents($url, false, $ctx);
    if ($data === false) throw new Exception("file_get_contents falhou em $url");
    return $data;
  }
}

function to_utf8($str) {
  if ($str === '' || $str === null) return $str;
  if (function_exists('mb_check_encoding') && mb_check_encoding($str, 'UTF-8')) {
    return $str;
  }
  if (function_exists('iconv')) {
    $conv = @iconv('ISO-8859-1', 'UTF-8//IGNORE', $str);
    if ($conv !== false) return $conv;
  }
  if (function_exists('utf8_encode')) return utf8_encode($str);
  return $str;
}

// === 1) Ler 7.html do ShoutCast ===
try {
  $raw = http_get_bytes("$SC_BASE/7.html");
} catch (Exception $e) {
  http_response_code(502);
  echo json_encode([
    'error' => 'Falha ao ler status do servidor',
    'details' => $e->getMessage(),
    'online' => false,
    'currentListeners' => 0,
    'streamTitle' => 'Rádio Habblive',
    'currentSong' => null,
    'streamGenre' => 'Tocando as Melhores'
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

// Remove tags HTML e normaliza
$raw = strip_tags($raw);
$raw = trim($raw);

// Procura a primeira linha com pelo menos 7 colunas separadas por vírgula
$line = null;
foreach (preg_split("/\r\n|\n|\r/", $raw) as $l) {
  if (substr_count($l, ',') >= 6) { 
    $line = trim($l); 
    break; 
  }
}
if (!$line) $line = $raw;

$parts = array_map('trim', explode(',', $line));
if (count($parts) < 7) {
  http_response_code(502);
  echo json_encode([
    'error' => 'Formato inesperado do servidor',
    'raw' => substr($raw, 0, 200),
    'online' => false,
    'currentListeners' => 0,
    'streamTitle' => 'Rádio Habblive',
    'currentSong' => null,
    'streamGenre' => 'Tocando as Melhores'
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

// Extrai os dados do 7.html
list($cur, $status, $peak, $max, $unique, $br) = array_slice($parts, 0, 6);
$songtitle = implode(',', array_slice($parts, 6));
$songtitle = to_utf8($songtitle);

// === 2) Tentar obter Stream Title/Genre da página principal ===
$streamTitle = null;
$streamGenre = null;
try {
  $html = http_get_bytes("$SC_BASE/");
  $html = to_utf8($html);
  $flat = preg_replace('/\s+/', ' ', $html);

  // Busca o Stream Title (nome do locutor)
  if (preg_match('/Stream\s*Title\s*:?[^<]*<[^>]*>\s*([^<]+)/i', $flat, $m)) {
    $streamTitle = trim($m[1]);
  } elseif (preg_match('/Server\s*Title\s*:?[^<]*<[^>]*>\s*([^<]+)/i', $flat, $m)) {
    $streamTitle = trim($m[1]);
  }
  
  // Busca o Stream Genre (programação)
  if (preg_match('/Stream\s*Genre\s*:?[^<]*<[^>]*>\s*([^<]+)/i', $flat, $m)) {
    $streamGenre = trim($m[1]);
  } elseif (preg_match('/Server\s*Genre\s*:?[^<]*<[^>]*>\s*([^<]+)/i', $flat, $m)) {
    $streamGenre = trim($m[1]);
  }
} catch (Exception $e) {
  // Se falhar, continua com valores padrão
}

// === 3) Montar resposta no formato esperado ===
$isOnline = (intval($status) === 1);

$response = [
  'online'           => $isOnline,
  'currentListeners' => intval($cur),
  'maxListeners'     => is_numeric($max) ? intval($max) : null,
  'peakListeners'    => is_numeric($peak) ? intval($peak) : null,
  'uniqueListeners'  => is_numeric($unique) ? intval($unique) : null,
  'bitrate'          => is_numeric($br) ? intval($br) : null,
  'currentSong'      => ($songtitle !== '' && $songtitle !== null) ? $songtitle : null,
  'streamTitle'      => $streamTitle ?: 'Rádio Habblive',
  'streamGenre'      => $streamGenre ?: 'Tocando as Melhores',
  'streamUrl'        => 'https://sonicpanel.oficialserver.com/8342/;',
  'fonte'            => 'shoutcast-v1',
  'updated_at'       => gmdate('c'),
];

// === 4) Saída JSON ===
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
?>