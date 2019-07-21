#!/bin/sh

DL_CONFIG=webapps/digilib/WEB-INF/digilib-config.xml

if [ ! -f $DL_CONFIG ] ; then
# generate digilib config using ENV
cat <<EOF > $DL_CONFIG
<?xml version="1.0" encoding="UTF-8"?>
<digilib-config>
    <!-- A list of directories where images are searched -->
    <parameter name="basedir-list" value="${BASEDIR_LIST:-/usr/local/tomcat/webapps/digilib/sample-images}" />
    
    <!-- The default interpolation quality (0-2). -->
    <parameter name="default-quality" value="${DEFAULT_QUALITY:-2}" />

    <!-- The maximum size of delivered images as pixel area, 40000 means up to 200x200 or 100x400, 0 means no limit. -->
    <parameter name="max-image-size" value="${MAX_IMAGE_SIZE:-0}" />
    
  	<!-- is sending whole image files with mo=file allowed? -->
  	<parameter name="sendfile-allowed" value="${SENDFILE_ALLOWED:-true}" />

  	<!-- number of working threads -->
  	<parameter name="worker-threads" value="${WORKER_THREADS:-2}" />

  	<!-- number of waiting requests in queue -->
  	<parameter name="max-waiting-threads" value="${MAX_WAITING_THREADS:-20}" />

    <!-- The prefix (after Scaler) that leads to the IIIF API.-->    
    <parameter name="iiif-prefix" value="${IIIF_PREFIX:-IIIF}" />

    <!-- base URL for IIIF image API -->
    <parameter name="iiif-image-base-url" value="${IIIF_IMAGE_BASE_URL}" />
    
    <!-- base URL for IIIF presentation API -->
    <parameter name="iiif-manifest-base-url" value="${IIIF_MANIFEST_BASE_URL}" />

</digilib-config>
EOF
fi

# run the command given in the origin Dockerfile at CMD 
exec catalina.sh run
