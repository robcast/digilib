# Server setup for digilib

There are a variety of ways to deploy digilib on different server configurations for production sites. 

Here are some examples and tips.

## nginx as proxy

This is an example configuration for `nginx` as a proxy for a single instance
of digilib (listening on port `8080`) that handles transport encryption and
restricts access to sensitive data to the gateway of a local network
(`1.2.3.4`).

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name digilib.example.org;

    # this certificate chain shall *not* include the root certificate:
    ssl_certificate /etc/ssl/certs/digilib.example.org.pem;
    ssl_certificate_key /etc/ssl/private/digilib.example.org.key;

    include /etc/nginx/proxy_params;

    location ~* .*/(dlConfig|dlRequest).jsp$ {
        allow 1.2.3.4;
        deny all;
        proxy_pass http://localhost:8080;
    }

    location / {
        proxy_pass http://localhost:8080;
    }
}
```

### Resources

- the [nginx documentation](nginx.org/en/docs/)

## Apache as proxy and load-balancer

This is an example configuration for [Apache](https://httpd.apache.org/) as a proxy and load balancer for two instances of 
digilib (one running on localhost, port 8080 and another on otherserver, port 8080), using SSL and http/2:

```
<VirtualHost *:443>
    # HTTP/2 protocol (Apache 2.4.29 and later)
    Protocols h2 http/1.1
    ServerName digilib.example.com
    SSLCertificateFile /etc/ssl/private/digilib-cert.pem
    SSLCertificateKeyFile /etc/ssl/private/digilib-key.pem
    SSLEngine on

    DocumentRoot /var/www
    <Directory />
        Options FollowSymLinks
        AllowOverride None
    </Directory>
    <Directory /var/www/>
        Options Indexes FollowSymLinks MultiViews
        AllowOverride None
        Order allow,deny
        allow from all
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/digilib-ssl-error.log
    LogLevel warn
    CustomLog ${APACHE_LOG_DIR}/digilib-ssl-access.log combined

    # do not forward-proxy!
    ProxyRequests off
    # set proxy headers
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    # digilib instances 
    <Proxy balancer://digilibs>
       BalancerMember http://127.0.0.1:8080
       BalancerMember http://otherserver.example.com:8080
    </Proxy>
    # balance by busy-ness
    ProxyPass /digitallibrary balancer://digilibs/digitallibrary lbmethod=bybusyness
    ProxyPassReverse /digitallibrary balancer://digilibs/digitallibrary

    # balancer-manager frontend (be careful!)
    <Location /balancer-manager>
        SetHandler balancer-manager
        Require host localhost
    </Location>
</VirtualHost>
```

## Jetty behind a proxy

When you are using [Jetty](https://www.eclipse.org/jetty/) as servlet container behind an Apache or nginx proxy
then you should make sure that Jetty processes the `X-Forwarded-*` headers from the proxy server to derive the 
correct request URL for the servlets.

Please see [this information for Jetty 9.4](http://www.eclipse.org/jetty/documentation/9.4.x/configuring-connectors.html#_proxy_load_balancer_connection_configuration)
or [this information for Jetty 8 and earlier versions](https://wiki.eclipse.org/Jetty/Tutorial/Apache#Configuring_mod_proxy_http).

## Tomcat behind a proxy

When you are using [Tomcat](https://tomcat.apache.org) as a servlet container behind an Apache or nginx proxy then 
you should make sure that Tomcat processes the `X-Forwarded-*` headers from the proxy server to derive the 
correct request URL for the servlets.

Please see the Tomcat documentation about the [Remote IP Valve](https://tomcat.apache.org/tomcat-9.0-doc/config/valve.html#Remote_IP_Valve).
You basically need to add the following XML tag with your proxy's IP numbers to the `Host` tag of your `server.xml` file:
```
  <Valve className="org.apache.catalina.valves.RemoteIpValve"
    internalProxies="127\.0\.0\.1|123\.45\.67\.89"
    remoteIpHeader="x-forwarded-for" 
    proxiesHeader="x-forwarded-by" 
    protocolHeader="x-forwarded-proto" />
```
and make sure `ProxyPreserveHost` is set to `on`.
