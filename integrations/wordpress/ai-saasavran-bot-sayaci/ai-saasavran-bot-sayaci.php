<?php
/**
 * Plugin Name: AI SaaSavran Bot ve Ziyaretçi Sayacı
 * Plugin URI: https://aisaasavran.com/
 * Description: Yapay zekâ botlarının (OAI-SearchBot, ClaudeBot, PerplexityBot…) sitenizde hangi sayfaları okuduğunu ve yapay zekâ asistanlarından gelen ziyaretçileri AI SaaSavran raporunuza bildirir. Çerez kullanmaz, ziyaretçilerin kişisel verisini saklamaz.
 * Version: 1.0.0
 * Author: AI SaaSavran
 * License: GPLv2 or later
 * Text Domain: ai-saasavran
 */
if (!defined('ABSPATH')) { exit; }

const AISV_API = 'https://aisaasavran.com';
const AISV_BOT_RE = '/OAI-SearchBot|ChatGPT-User|GPTBot|Claude-SearchBot|Claude-User|ClaudeBot|anthropic-ai|PerplexityBot|Perplexity-User|Google-CloudVertexBot|Applebot|bingbot|DuckAssistBot|MistralAI-User|meta-external|Amazonbot|Bytespider|CCBot/i';

function aisv_key() {
  $k = trim((string) get_option('aisv_site_key', ''));
  return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $k) ? $k : '';
}

// Bot isteği: sayfa gönderildikten sonra, beklemeden (blocking=false) bildirilir. IP yalnız doğrulama için gönderilir; AI SaaSavran saklamaz.
add_action('shutdown', function () {
  $key = aisv_key();
  if (!$key || is_admin()) { return; }
  $ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
  if ($ua === '' || !preg_match(AISV_BOT_RE, $ua)) { return; }
  $path = isset($_SERVER['REQUEST_URI']) ? strtok((string) $_SERVER['REQUEST_URI'], '?') : '/';
  $code = http_response_code();
  wp_remote_post(AISV_API . '/api/ai-bot', array(
    'blocking' => false,
    'timeout'  => 1,
    'headers'  => array('content-type' => 'application/json'),
    'body'     => wp_json_encode(array(
      'k' => $key, 'ua' => substr($ua, 0, 500), 'ip' => isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '',
      'path' => substr((string) $path, 0, 200), 'status' => $code ? (int) $code : 200,
    )),
  ));
});

// Yapay zekâdan gelen ziyaretçi sayacı (tarayıcıda, yalnız yapay zekâ kaynaklı ziyaretlerde bildirir)
add_action('wp_head', function () {
  $key = aisv_key();
  if ($key) { echo '<script async src="' . esc_url(AISV_API . '/t.js') . '" data-site="' . esc_attr($key) . '"></script>' . "\n"; }
});

add_action('admin_menu', function () {
  add_options_page('AI SaaSavran', 'AI SaaSavran', 'manage_options', 'ai-saasavran', 'aisv_settings_page');
});
add_action('admin_init', function () {
  register_setting('aisv', 'aisv_site_key', array('type' => 'string', 'sanitize_callback' => 'sanitize_text_field'));
});
function aisv_settings_page() {
  if (!current_user_can('manage_options')) { return; }
  ?>
  <div class="wrap">
    <h1>AI SaaSavran</h1>
    <p>AI SaaSavran raporunuzdaki "Yapay zekâ botları" bölümünde yazan <strong>site anahtarını</strong> buraya yapıştırın.</p>
    <form method="post" action="options.php">
      <?php settings_fields('aisv'); ?>
      <input type="text" name="aisv_site_key" value="<?php echo esc_attr(get_option('aisv_site_key', '')); ?>" class="regular-text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
      <?php submit_button('Kaydet'); ?>
    </form>
    <p><?php echo aisv_key() ? '✓ Sayaç açık.' : 'Sayaç kapalı: geçerli bir anahtar girin.'; ?></p>
  </div>
  <?php
}
