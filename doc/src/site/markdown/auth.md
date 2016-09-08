# digilib image permissions

If all your images are free and available to everybody or if your server is not
reachable from the internet then congratulations, you can run digilib without 
authorization. You can leave the [digilib-config](digilib-config.html) setting 

	use-authorization=false

and ignore the rest of this chapter.

But if you have some images that are freely available and others 
that should be only visible to some users then you need to configure digilib's
authentication and authorization mechanism and set

	use-authorization=true
  
## Authentication and authorization

digilib has different mechanisms for the tasks of *authentication* - establishing
the identity of the user requesting the image (more accurately the roles associated to
this identity) - and *authorization* - establishing the rules for accessing specific
images (the roles required to access the image).

The authe**n**tication mechanism is implemented by the digilib.auth.Auth**n**Ops interface
implemented through the class configured in the `digilib-config` parameter
`authnops-class` while the auhtori**z**ation mechanism is implemented by the
digilib.auth.Auth**z**Ops interface implemented through the class configured in
`authzops-class`.

All authentication and authorization classes are configured through different elements
in the common config file

	digilib-auth.xml
	
in the `WEB-INF` directory.

### Authentication: IpAuthnOps

`digilib.auth.IpAuthnOps` assigns roles based on the IP address of the user requesting the
image. This works well for situations where all users of the local network are allowed to
access resources. The class reads the tag `digilib-adresses` from `digilib-auth.xml`:

	<digilib-addresses>
 	  <address ip="130.92.68" role="eastwood-coll,ptolemaios-geo" />
	  <address ip="130.92.151" role="wtwg" />
	  <address ip="0:0:0:0:0:0:0:1" role="local" />
	</digilib-addresses>

A computer with an ip address that matches "ip" is automatically granted all roles under "role".
The ip address is matched from the left (in full quads). Roles under "role" must be separated by comma only (no spaces). 

Caution: If you run your Servlet Container (Tomcat) behind Apache or another reverse proxy
then Tomcat only sees the IP-Address of the Apache server for all connections. You need to
configure Tomcat to honor the `X-Forwarded-For` and `X-Forwarded-Proto` headers.

### Authentication: IpServletAuthnOps

`digilib.auth.IpServletAuthnOps` assigns roles based on the IP Address of the user requesting
the image (see `IpAuthnOps` above) and uses the `ServletRequest.isUserInRole()` function of 
the Servlet Container if the roles provided by the IP address are not sufficient.


