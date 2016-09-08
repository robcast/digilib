# Access control

If all your images are free and available to everybody or if your server is not
reachable from the internet then congratulations, you can run digilib without 
authorization: Leave the [digilib-config](digilib-config.html) setting 

	use-authorization=false

and ignore the rest of this chapter.

But if you have some images that are freely available and others 
that should be only visible to some users then you need to set

	use-authorization=true
  
and configure digilib's authentication and authorization mechanism.

## Authentication and authorization

digilib has different mechanisms for the tasks of *authentication* - establishing
the identity of the user requesting the image (more accurately the roles associated to
this identity) - and *authorization* - establishing the rules for accessing specific
images (the roles required to access the image).

The authe<b>n</b>tication mechanism is implemented by the digilib.auth.Auth<b>n</b>Ops interface
implemented through the class configured in the `digilib-config` parameter
`authnops-class` while the authori<b>z</b>ation mechanism is implemented by the
digilib.auth.Auth<b>z</b>Ops interface implemented through the class configured in
`authzops-class`.

All authentication and authorization classes are configured through different elements
in the XML config file

	digilib-auth.xml
	
in the `WEB-INF` directory (the file name can be configured with the `digilib-config`
parameter `auth-file`).

In short: you need to set both `authnops-class` and `authzops-class` in `digilib-config` with
two of the classes described below (or implement your own) and create a `digilib-auth.xml` file
with the configuration for the chosen implementations.

### Authentication: IpAuthnOps

`digilib.auth.IpAuthnOps` assigns roles based on the IP address of the user requesting the
image. This works well for situations where all users of the local network are allowed to
access resources. The class reads the tag `digilib-adresses` from `digilib-auth.xml`:

    <digilib-addresses>
      <address ip="130.92.68" role="eastwood-coll,ptolemaios-geo" />
      <address ip="130.92.151" role="wtwg" />
      <address ip="0:0:0:0:0:0:0:1" role="local" />
    </digilib-addresses>

A computer with an ip address that matches `ip` is automatically granted all roles under `role`.
The ip address is matched from the left (in full quads). Roles under "role" must be separated by comma only (no spaces). 

Caution: If you run your Servlet Container (Tomcat) behind Apache or another reverse proxy
then Tomcat only sees the IP address of the proxy server for all connections. You need to
configure Tomcat to honor the `X-Forwarded-For` and `X-Forwarded-Proto` headers.

### Authentication: IpServletAuthnOps

`digilib.auth.IpServletAuthnOps` assigns roles based on the IP address of the user requesting
the image (see `IpAuthnOps` above) and uses the `ServletRequest.isUserInRole()` function of 
the Servlet Container if the roles provided by the IP address are not sufficient.

Using authentication information from the Servlet Container requires that the Servlet Container
is configured for authentication. For information about this please refer to the 
documentation of your Servlet Container.

For Tomcat 8 there is documentation at 
(https://tomcat.apache.org/tomcat-8.0-doc/realm-howto.html)[https://tomcat.apache.org/tomcat-8.0-doc/realm-howto.html]
Note that you need to configure a `<security-constraint>` in `web.xml` to force the 
server to ask for a password (there is an old example in `web-additional.xml`).

### Authentication: OpenIdAuthnOps

`digilib.auth.OpenIdAuthnOps` assigns roles based on an [OpenId-Connect](http://openid.net/) token
passed with the request. The token can be passed either in the URL parameter `id_token` or as a cookie
with the name `id_token` (the name of the cookie can be configured with the `digilib-config` 
parameter `authn-token-cookie`).

The class reads the tag `digilib-oauth` from `digilib-auth.xml`:

    <digilib-oauth>
      <openid issuer="https://id.some.where" clientid="myclient" roles="openid-users" keytype="jwk">
        {"kty":"RSA","e":"AQAB","kid":"rsa1","alg":"RS256","n":"qt6yOiI_wCoCVlGO0MySsez...Lf9by7TGw"}   
      </openid>
    </digilib-oauth>

The `openid` tag defines roles (in `role`, separated by comma only, no spaces) 
that will be granted to the user that provides a valid token from the given server.
The server is identified by the url in `issuer`, the
client id in `clientid` and the public key of the server in JWK format as content 
of the tag. There can be multiple `openid` tags.

To set up a connection with an OpenId-Connect identity server you usually have to enter the
URL of your digilib instance as a redirect URL and the client id that you chose
and make sure that the server answers requests with `response_type=id_token`. The public
key of the server in JWK format can often be requested from the server by adding `/jwk` to
the URL.

To automatically authenticate with OpenId in the digilib Javascript frontend you can use the 
digilib plugin `jquery.digilib.oauth.js` and configure it with the URL of the ID server as
`authServerUrl` and the client id as `authClientId`. This will give you an extra login button
that authenticates the user by redirecting her to the ID server. You can additionally set 
`authOnErrorMode` to true to automatically authenticate the user whenever the image from 
the digilib server doesn't load which is usually caused by missing authentication 
(there is an example in `jquery/digilib-auth.html`).

### Authentication: IpOpenIdAuthnOps

`digilib.auth.IpOpenIdAuthnOps` assigns roles based on the IP address of the user requesting
the image (see `IpAuthnOps` above) and uses an OpenId-Connect token passed with the request
(see `OpenIdAuthnOps` above) if the roles provided by the IP address are not sufficient.

### Authorization: PathAuthzOps

`digilib.auth.PathAuthzOps` requests roles based on the directory path of the requested image.
All images in the given directory and all its subdirectories can be accessed only if the user
can provide one of the requested roles.

The class reads the tag `digilib-paths` from `digilib-auth.xml`:

    <digilib-paths>
      <path name="histast/eastwood-collection" role="eastwood-coll"/>
      <path name="documents/nonpublic" role="openid-user,eastwood-coll"/>
    </digilib-paths>

A user must supply one of the roles in `role` to access the directory in `name`.
Roles in `role` must be separated by comma only (no spaces).

### Authorization: MetaAccessAuthzOps

`digilib.auth.MetaAccessAuthzOps` requests roles using "access" information in the file metadata.
 
This requires a `FileMeta` implementation (configured in the `filemeta-class` parameter of 
`digilib-config`) that provides an `access` key in the metadata returned by `DocuDirent.getMeta().getFileMeta()`
like `digilib.meta.IndexMetaFileMeta`.

The class reads the tag `digilib-access` from `digilib-auth.xml`: 

    <digilib-access>
      <access type="group:mpiwg" role="mpiwg-user"/>
      <access type="default" role=""/>
    </digilib-access>

A user must supply one of the roles in `role` to access any object with a metadata access value 
matching `type`.
Roles in `role` must be separated by comma only (no spaces).

The access type `default` is special, it applies to all objects without metadata access information.

`digilib.meta.IndexMetaFileMeta` reads XML files conforming to the 
["index.meta" specification](http://intern.mpiwg-berlin.mpg.de/digitalhumanities/mpiwg-metadata-documentation/formate/indexmeta-standard)
and extracts image information from the `meta/img` tag and access information from the 
`meta/access-conditions` tag (see also class `digilib.meta.IndexMetaAuthLoader`).

