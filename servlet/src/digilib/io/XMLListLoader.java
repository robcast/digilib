/* XMLListLoader -- Load an XML list into a Hashtable

  Digital Image Library servlet components

  Copyright (C) 2001, 2002 Robert Casties (robcast@mail.berlios.de)

  This program is free software; you can redistribute  it and/or modify it
  under  the terms of  the GNU General  Public License as published by the
  Free Software Foundation;  either version 2 of the  License, or (at your
  option) any later version.
   
  Please read license.txt for the full details. A copy of the GPL
  may be found at http://www.gnu.org/copyleft/lgpl.html

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

*/

package digilib.io;

// JAXP packages
import javax.xml.parsers.*;
import org.xml.sax.*;
import org.xml.sax.helpers.*;

import java.util.*;
import java.io.*;

public class XMLListLoader {

    private String listTag = "list";
    private String entryTag = "entry";
    private String keyAtt = "key";
    private String valueAtt = "value";

    public XMLListLoader() {
    }

    public XMLListLoader(String list_tag, String entry_tag, String key_att, String value_att) {
      //System.out.println("xmlListLoader("+list_tag+","+entry_tag+","+key_att+","+value_att+")");
      listTag = list_tag;
      entryTag = entry_tag;
      keyAtt = key_att;
      valueAtt = value_att;
    }

    /**
     *  inner class XMLListParser to be called by the parser
     */
    private class XMLListParser extends DefaultHandler {

      private Hashtable listData;
      private Stack nameSpace;
    
      public Hashtable getData() {
        return listData;
      }

      // Parser calls this once at the beginning of a document
      public void startDocument() throws SAXException {
          listData = new Hashtable();
          nameSpace = new Stack();
      }

      // Parser calls this for each element in a document
      public void startElement(String namespaceURI, String localName,
                               String qName, Attributes atts)
  	throws SAXException
      {
        //System.out.println("<"+qName);
        // open a new namespace
        nameSpace.push(qName);

        // ist it an entry tag?
        if (qName.equals(entryTag)) {
          // is it inside a list tag?
          if ((listTag.length() > 0)&&(nameSpace.search(listTag) < 0)) {
            System.out.println("BOO: Entry "+entryTag+" not inside list "+listTag);
            throw new SAXParseException("Entry "+entryTag+" not inside list "+listTag, null);
          }
          // get the attributes
          String key = atts.getValue(keyAtt);
          String val = atts.getValue(valueAtt);
          if ((key == null)||(val == null)) {
            System.out.println("BOO: Entry "+entryTag+" does not have Attributes "+keyAtt+", "+valueAtt);
            throw new SAXParseException("Entry "+entryTag+" does not have Attributes "+keyAtt+", "+valueAtt, null);
          }
          // add the values
          //System.out.println("DATA: "+key+" = "+val);
          listData.put(key, val);
        }
    }

    public void endElement(String namespaceURI, String localName,
                             String qName)
	throws SAXException
    {
      // exit the namespace
      nameSpace.pop();
    }

    }


    /**
     *  load and parse a file (as URL)
     *    returns Hashtable with list data
     */
    public Hashtable loadURL(String path) throws SAXException, IOException {
        //System.out.println("loadurl ("+path+")");
        // Create a JAXP SAXParserFactory and configure it
        SAXParserFactory spf = SAXParserFactory.newInstance();
        //spf.setNamespaceAware(true);

        XMLReader xmlReader = null;
        try {
          // Create a JAXP SAXParser
          SAXParser saxParser = spf.newSAXParser();

          // Get the encapsulated SAX XMLReader
          xmlReader = saxParser.getXMLReader();
        }
        catch (ParserConfigurationException e) {
          throw new SAXException(e);
        }

        // create a list parser (keeps the data!)
        XMLListParser listParser = new XMLListParser();

        // Set the ContentHandler of the XMLReader
        xmlReader.setContentHandler(listParser);

        // Tell the XMLReader to parse the XML document
        xmlReader.parse(path);

        return listParser.getData();
    }

}
