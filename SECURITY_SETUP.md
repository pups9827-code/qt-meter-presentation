# Безопасность pupsiks.pro

Сайт публикуется на GitHub Pages из ветки `main`, из корня репозитория
`pups9827-code/qt-meter-presentation`. Канонический домен — `pupsiks.pro`.
В репозитории уже есть CSP в HTML. Настройки ниже применяются в GitHub и Cloudflare
после публикации обновлённого сайта.

## 1. DNS, подтверждение домена и HTTPS

1. Добавьте `pupsiks.pro` в Cloudflare. Перенесите действующие DNS-записи, в том
   числе TXT, MX и CAA, если они есть. У регистратора установите два NS, выданные
   Cloudflare, и дождитесь статуса **Active**. При переносе зоны с DNSSEC проверьте
   DS у регистратора и включите DNSSEC с новыми данными Cloudflare после переноса.
2. На время проверки GitHub поставьте следующий набор записей в режим **DNS only**.
   Сохраните доменные TXT и почтовые записи. Замените конфликтующие веб-записи
   для тех же имён. Если используете IPv6, добавьте весь указанный набор AAAA.
   Wildcard-запись для GitHub Pages не создавайте.

   | Тип | Имя | Значение |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` |
   | AAAA | `@` | `2606:50c0:8001::153` |
   | AAAA | `@` | `2606:50c0:8002::153` |
   | AAAA | `@` | `2606:50c0:8003::153` |
   | CNAME | `www` | `pups9827-code.github.io` |

3. В личных настройках GitHub владельца `pups9827-code` откройте **Settings →
   Pages → Add a domain**, введите `pupsiks.pro` и добавьте в Cloudflare TXT с
   точными именем и значением, выданными GitHub. Для этого аккаунта имя обычно
   выглядит как `_github-pages-challenge-pups9827-code` внутри зоны. Нажмите
   **Verify** и сохраните TXT для последующих проверок.
4. В репозитории откройте **Settings → Pages**. Убедитесь, что **Custom domain**
   равен `pupsiks.pro`, источник — **Deploy from a branch → main → / (root)**,
   а DNS check успешен. Дождитесь сертификата GitHub и отметьте **Enforce HTTPS**.
   Проверьте, что оба HTTPS-имени открываются и `www` перенаправляет на основной домен.
   Если есть ограничительные CAA, они должны разрешать выпуск сертификата
   GitHub Pages через Let's Encrypt и выпуск Universal SSL для вашей зоны.
5. В Cloudflare дождитесь **Universal SSL: Active**. В **SSL/TLS → Overview**
   выберите **Full (strict)**. Затем переключите веб-записи `@` и `www` в
   **Proxied** и включите **SSL/TLS → Edge Certificates → Always Use HTTPS**.
   Повторно проверьте оба имени. При 525/526 проверьте сертификат GitHub с
   временным **DNS only** и верните проксирование после исправления.
   Cloudflare защищает трафик, который проходит через его прокси. У GitHub Pages
   публичный origin, поэтому эти меры не закрывают прямой доступ к нему.

## 2. DDoS, WAF, боты и ZIP

Защита Cloudflare от HTTP DDoS работает для проксируемых записей автоматически.
В **Security → Security rules → Managed rules** проверьте активность
**Cloudflare Free Managed Ruleset** на Free. На Pro и выше включите
**Cloudflare Managed Ruleset** с его стандартными действиями и отслеживайте
срабатывания в **Security → Analytics → Events**.

В **Security → Security rules → Create rule → Custom rules** создайте правило
`Static site methods and internal paths`. В **Edit expression** вставьте:

~~~text
(http.host in {"pupsiks.pro" "www.pupsiks.pro"} and
  (not http.request.method in {"GET" "HEAD" "OPTIONS"} or
   lower(http.request.uri.path) in {"/.git" "/.env" "/.github" "/_config.yml" "/security_setup.md"} or
   starts_with(lower(http.request.uri.path), "/.git/") or
   starts_with(lower(http.request.uri.path), "/.github/") or
   starts_with(lower(http.request.uri.path), "/.env.")))
~~~

Выберите **Block → Deploy**. Правило оставляет `/.well-known/security.txt` доступным.

В **Security → Security rules → Create rule → Rate limiting rules** создайте
`ZIP downloads`. Для Free используйте выражение, доступное на этом тарифе:

~~~text
ends_with(lower(http.request.uri.path), ".zip")
~~~

На Pro и выше можно ограничить правило именами сайта:

~~~text
(http.host in {"pupsiks.pro" "www.pupsiks.pro"} and
 ends_with(lower(http.request.uri.path), ".zip"))
~~~

Выберите **IP** как характеристику, **20 запросов за 10 секунд**, действие
**Block**, срок блокировки **10 секунд**. Если доступен параметр **Also apply
rate limiting to cached assets**, оставьте его включённым. Это стартовый лимит
по запросам, включая повторные и Range-запросы. За одним IP могут находиться
несколько посетителей. Используйте события Cloudflare для корректировки лимита.
На Free доступно одно такое правило на зону, и выражение по пути затрагивает
остальные проксируемые имена этой зоны, если они тоже отдают ZIP.

В **Security Settings** задайте настройки ботов:

- **Free** — оставьте **Bot Fight Mode: Off** для этой статической CSP. У
  бесплатного режима JavaScript Detections включается принудительно, а Cloudflare
  предупреждает о конфликте с inline CSP и отсутствии исключений через WAF.
  Для пробного включения используйте **Bot Fight Mode: On**, проверьте сайт
  в браузере и обычное скачивание ZIP, затем проверьте журнал событий и консоль.
  При ошибках верните **Off**. Не ослабляйте CSP через `unsafe-inline`.
- **Pro / Business** с Super Bot Fight Mode — **Verified bots: Allow**,
  **Definitely automated: Managed Challenge**, **Likely automated: Allow**,
  если пункт доступен. Оставьте **JavaScript Detections: Off** и
  **Static resource protection: Off**, если эти переключатели доступны.
  Проверьте скачивание и доступность сайта из обычного браузера.

## 3. HTTP-заголовки

В **Rules → Overview → Create rule → Response Header Transform Rule** создайте
правило `pupsiks security headers`. Условие
`(http.host in {"pupsiks.pro" "www.pupsiks.pro"})`. Для каждого заголовка
выберите **Set static**.

| Заголовок | Значение |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |

После проверки HTTPS на обоих именах задайте в этом правиле
`Strict-Transport-Security: max-age=86400`. После стабильной работы можно заменить
значение на `max-age=31536000`. Не дублируйте этот заголовок отдельным
переключателем HSTS. `includeSubDomains` и `preload` оставьте выключенными,
пока не проверены все поддомены и последствия включения.

Создайте два других **Response Header Transform Rules** с **Set static** для
`Content-Security-Policy`. Условия разделяют политики по маршрутам.

**Главная и Python**

~~~text
(http.host in {"pupsiks.pro" "www.pupsiks.pro"} and
 not starts_with(http.request.uri.path, "/presentation/") and
 (http.request.uri.path in {"/" "/python/"} or ends_with(http.request.uri.path, ".html")))
~~~

~~~text
default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; script-src 'self' https://mc.yandex.ru https://yastatic.net; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; connect-src https://mc.yandex.ru; img-src 'self' https://mc.yandex.ru; font-src 'self'; frame-src 'none'; frame-ancestors 'none'
~~~

**Презентация**

~~~text
(http.host in {"pupsiks.pro" "www.pupsiks.pro"} and
 starts_with(http.request.uri.path, "/presentation/") and
 (http.request.uri.path eq "/presentation/" or ends_with(http.request.uri.path, ".html")))
~~~

~~~text
default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; script-src 'self' https://mc.yandex.ru https://yastatic.net; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; connect-src https://mc.yandex.ru; img-src 'self' data: https://mc.yandex.ru; font-src 'self' data:; frame-src 'none'; frame-ancestors 'none'
~~~

Шрифты Cormorant Garamond и Manrope, а также остальные ресурсы презентации встроены в CSS/JS.
`data:` нужен только для изображений и шрифтов презентации. Open-Meteo упомянут
в примере Python и не является сетевой зависимостью сайта. Скрипт Метрики обновляется
по постоянному URL, поэтому фиксированный SRI привёл бы к отказу загрузки при его
обновлении. Если включаете дополнительные скрипты или функции Cloudflare,
проверьте их совместимость с обеими политиками. Rocket Loader оставьте выключенным.
`frame-ancestors` задаётся в HTTP-заголовке и защищает страницы от встраивания.
Диалоги сайта работают через `<dialog>` и не зависят от iframe.

Проверьте через браузер и заголовки:

~~~sh
curl -IL https://www.pupsiks.pro/
curl -sSI https://pupsiks.pro/
curl -sSI https://pupsiks.pro/python/index.html
curl -sSI https://pupsiks.pro/presentation/
curl -fsS https://pupsiks.pro/.well-known/security.txt
curl -fsS https://pupsiks.pro/robots.txt
~~~

Откройте коллекцию, презентацию и урок Python, проверьте скачивание ZIP и
отсутствие блокировок ресурсов в консоли. Для `security.txt` ожидается
`Content-Type: text/plain`. Обновите `Expires` до указанной даты и сохраните
рабочий публичный адрес для сообщений.

## 4. Проверка ZIP

Скачайте `qt_meteor_project.zip` и `checksums.txt` в одну папку.
На macOS или Linux выполните в ней `shasum -a 256 -c checksums.txt`.
В PowerShell выполните `Get-FileHash .\qt_meteor_project.zip -Algorithm SHA256`
и сравните результат с манифестом. При замене архива пересчитайте `checksums.txt`
и опубликуйте оба файла одним коммитом. Контрольная сумма с того же сайта
позволяет сверить байты скачанного файла, но не заменяет цифровую подпись.

## Документация

- [GitHub Pages: custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub Pages: verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [Cloudflare: Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [Cloudflare: WAF](https://developers.cloudflare.com/waf/)
- [Cloudflare: rate limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [Cloudflare: Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/)
- [Cloudflare: response headers](https://developers.cloudflare.com/rules/transform/response-header-modification/)
- [Яндекс Метрика: CSP](https://yandex.ru/support/metrica/en/code/install-counter-csp)
