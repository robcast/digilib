# Server setups for digilib

There are a variety of ways to deploy digilib on different server configurations for production sites. 

Here are some examples.

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

## Resources

- the [nginx documentation](nginx.org/en/docs/)
