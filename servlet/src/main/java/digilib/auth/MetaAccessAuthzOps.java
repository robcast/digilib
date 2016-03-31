package digilib.auth;

/*
 * #%L
 * Authorization class implementation using access information from 
 * file metadata.
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2013-2016 MPIWG Berlin
 * %%
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as 
 * published by the Free Software Foundation, either version 3 of the 
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Lesser Public License for more details.
 * 
 * You should have received a copy of the GNU General Lesser Public 
 * License along with this program.  If not, see
 * <http://www.gnu.org/licenses/lgpl-3.0.html>.
 * #L%
 * Author: Robert Casties (robcast@users.souceforge.net)
 */

import java.io.File;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import digilib.conf.DigilibConfiguration;
import digilib.conf.DigilibServletConfiguration;
import digilib.conf.DigilibServletRequest;
import digilib.image.ImageJobDescription;
import digilib.io.DocuDirCache;
import digilib.io.DocuDirent;
import digilib.io.FileOpException;
import digilib.meta.MetadataMap;
import digilib.util.XMLMapLoader;

/**
 * Implementation of AuthzOps using "access" information from file metadata. 
 * 
 * Requires FileMeta implementation providing "access", e.g. digilib.meta.IndexMetaFileMeta. 
 * 
 * The name of the configuration file is read from the digilib config parameter "auth-file".
 * <p/>
 * Tags "digilib-access" and "digilib-adresses" are read from the configuration file:
 * <pre>
 * {@code
 * <digilib-access>
 *   <access type="group:mpiwg" role="mpiwg-user"/>
 * </digilib-access>
 * }
 * </pre>
 * A user must supply one of the roles under "role" to access any object with the metadata "access" type of "type".
 * Roles under "role" must be separated by comma only (no spaces).
 * 
 */
public class MetaAccessAuthzOps extends AuthzOpsImpl {

    private File configFile;
    private Map<String, List<String>> rolesMap;

    /**
     * Initialize authentication operations.
     * 
     * Reads tag "digilib-access" from configuration file 
     * and sets up authentication arrays.
     * 
     * @throws AuthOpException
     *             Exception thrown on error.
     */
    @Override
    public void init(DigilibConfiguration dlConfig) throws AuthOpException {
        configFile = dlConfig.getAsFile("auth-file");
        logger.debug("IpRoleServletAuthops.init (" + configFile + ")");
        Map<String, String> roleList = null;
        try {
            // load role mappings
            XMLMapLoader roleLoader = new XMLMapLoader("digilib-access", "access", "type", "role");
            roleList = roleLoader.loadUri(configFile.toURI());
        } catch (Exception e) {
            throw new AuthOpException("ERROR loading authorization config file: " + e);
        }
        if (roleList == null) {
            throw new AuthOpException("ERROR unable to load authorization config file!");
        }
        // convert role list to map, splitting roles by ","
        rolesMap = new HashMap<String,List<String>>(roleList.size());
        for (String k : roleList.keySet()) {
            String rs = roleList.get(k);
            String[] ra = rs.split(",");
            rolesMap.put(k, Arrays.asList(ra));
        }
        // set authentication
        this.authnOps = (AuthnOps) dlConfig.getValue(DigilibServletConfiguration.AUTHN_OP_KEY);
    }

    /**
     * Return authorization roles needed for request.
     * 
     * Returns the list of authorization roles that are needed to access the
     * specified path. No list means the path is free.
     * 
     * The location information of the request is also considered.
     * 
     * @param request
     *            ServletRequest with address information.
     * @throws AuthOpException
     *             Exception thrown on error.
     * @return List of Strings with role names.
     */
    @Override
    public List<String> rolesForPath(DigilibServletRequest dlRequest) throws AuthOpException {
        HttpServletRequest request = dlRequest.getServletRequest();
        DocuDirent imgs;
        try {
            // try to get image file from JobDescription
            ImageJobDescription ticket = dlRequest.getJobDescription();
            if (ticket != null) {
                imgs = (DocuDirent) ticket.getImageSet();
            } else {
                // try to get image file from DirCache
                DigilibConfiguration config = dlRequest.getDigilibConfig();
                DocuDirCache cache = (DocuDirCache) config.getValue(DigilibServletConfiguration.DIR_CACHE_KEY);
                imgs = cache.getFile(dlRequest.getFilePath(), dlRequest.getAsInt("pn"));
            }
        } catch (FileOpException e) {
            throw new AuthOpException("No file for auth check!");
        }
        /*
         * get access restrictions from metadata
         */
        String access = null;
        try {
            imgs.checkMeta();
            MetadataMap meta = imgs.getMeta().getFileMeta();
            access = meta.get("access");
        } catch (Exception e) {
            logger.error("Error getting access meta for file!");
        }
        if (access == null) {
            // no access restriction - allow
            logger.debug("rolesForPath (" + imgs.getName() + ") by [" + request.getRemoteAddr() + "]: (none)");
            return null;
        }
        // get required roles
        List<String> required = rolesMap.get(access);
        logger.debug("rolesForPath (" + imgs.getName() + ") by [" + request.getRemoteAddr() + "]: "+required);
        return required;
    }

}
