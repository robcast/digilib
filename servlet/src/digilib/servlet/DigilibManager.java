/* DigilibManager.java -- work queue manager
 * 
 * Digital Image Library servlet components
 * 
 * Copyright (C) 2004 Robert Casties (robcast@mail.berlios.de)
 * 
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 * 
 * Please read license.txt for the full details. A copy of the GPL may be found
 * at http://www.gnu.org/copyleft/lgpl.html
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307 USA
 *  
 * Created on 18.10.2004
 */

package digilib.servlet;

import EDU.oswego.cs.dl.util.concurrent.BoundedBuffer;
import EDU.oswego.cs.dl.util.concurrent.Executor;
import EDU.oswego.cs.dl.util.concurrent.PooledExecutor;

/** work queue manager.
 * 
 * @author casties
 *
 */
public class DigilibManager implements Executor {
	
	private PooledExecutor workerQueue = null;
	
	private BoundedBuffer jobQueue = null;
	
	/**
	 * @param numFastLanes
	 * @param numSlowLanes
	 */
	public DigilibManager(int numLanes, int queueMax) {
		super();
		
		// create job queue
		jobQueue = new BoundedBuffer(queueMax);
		// create work queue
		workerQueue = new PooledExecutor(jobQueue, numLanes);
		workerQueue.abortWhenBlocked();

	}
	
	
	public void execute(Runnable worker) throws InterruptedException {
		workerQueue.execute(worker);
	}
	
	public int getQueueSize() {
		return jobQueue.size();
	}
}
