# build stage
FROM maven:3-jdk-11 AS buildstage
WORKDIR /usr/src/digilib
COPY . /usr/src/digilib/
ARG MVN_ARGS
# build digilib using maven
RUN mvn $MVN_ARGS package
# remove the war file so we don't copy it in the next stage
RUN rm /usr/src/digilib/frontend-jquery/target/digilib-frontend-jquery-*.war

# runnable container stage
FROM tomcat:9-jre11 AS runstage
# copy entry script
COPY build/docker/entrypoint.sh /entrypoint.sh
# remove tomcat default webapps and set entrypoint
RUN rm -r /usr/local/tomcat/webapps/* \
	&& chmod 755 /entrypoint.sh
# copy digilib from build image
COPY --from=buildstage /usr/src/digilib/frontend-jquery/target/digilib-frontend-jquery-* /usr/local/tomcat/webapps/digilib/

ENTRYPOINT ["/entrypoint.sh"]
