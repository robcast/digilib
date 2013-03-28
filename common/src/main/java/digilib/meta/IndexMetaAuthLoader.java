package digilib.meta;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URI;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

import org.apache.log4j.Logger;

/*
 * #%L
 * IndexMetaAuthLoader -- Load XML format metadata into MetadataMaps
 * 
 * Digital Image Library servlet components
 * 
 * %%
 * Copyright (C) 2013 MPIWG Berlin
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
 * Author: Robert Casties (robcast@berlios.de)
 */

/**
 * Class loading index.meta files with metadata extracting some image file
 * related information.
 * Extracts into the MetadataMap all tags in the meta/img tag as key-value
 * pairs.
 * Returns a map with filenames and MetadataMaps.
 * 
 * @see <a
 *      href="http://intern.mpiwg-berlin.mpg.de/digitalhumanities/mpiwg-metadata-documentation/formate/indexmeta-standard">index.meta
 *      spec</a>
 * @author Robert Casties
 * 
 */
public class IndexMetaAuthLoader {

    private Logger logger = Logger.getLogger(this.getClass());
    
    protected String metaTag = "meta";
    protected String fileTag = "file";
    protected String fileNameTag = "name";
    protected String filePathTag = "path";
    protected String imgTag = "img";

    private XMLStreamReader reader;
    private LinkedList<String> tags;
    private String filename;
    private String filepath;

    protected boolean readToMetaTag() throws XMLStreamException {
        String thisTag = null;
        String lastTag = null;
        StringBuffer text = null;
        for (int event = reader.next(); event != XMLStreamConstants.END_DOCUMENT; event = reader.next()) {
            if (event == XMLStreamConstants.START_ELEMENT) {
                lastTag = thisTag;
                text = new StringBuffer();
                // TODO: make namespace aware
                thisTag = reader.getLocalName();
                if (thisTag.equals(metaTag)) {
                    return true;
                }
                // save on stack
                tags.push(thisTag);
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                tags.pop();
                if (thisTag.equals(fileNameTag) && lastTag != null && lastTag.equals(fileTag)) {
                    // name inside file tag -> record name
                    filename = text.toString();
                } else if (thisTag.equals(filePathTag) && lastTag != null && lastTag.equals(fileTag)) {
                    // path inside file tag -> record path
                    filepath = text.toString();
                } 
            } else if (event == XMLStreamConstants.CHARACTERS) {
                text.append(reader.getText());
            }
        }
        return false;
    }

    /**
     * Load and parse a file (as URI).
     * returns HashMap with list data
     * 
     * @throws IOException
     */
    public Map<String, MetadataMap> loadUri(URI uri) throws IOException {
        Map<String, MetadataMap> files = new HashMap<String, MetadataMap>();
        try {
            InputStream in = uri.toURL().openStream();
            XMLInputFactory factory = XMLInputFactory.newInstance();
            reader = factory.createXMLStreamReader(in);
            // start reading
            tags = new LinkedList<String>();
            if (readToMetaTag()) {
                
            }
            
        } catch (MalformedURLException e) {
            logger.error("Malformed URL!");
            throw new IOException(e);
        } catch (XMLStreamException e) {
            logger.error("XMLStream Error!");
            throw new IOException(e);
        }
        return files;
    }
}
