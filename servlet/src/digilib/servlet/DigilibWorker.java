/* DigilibWorker.java -- image operation worker
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

import org.apache.log4j.Logger;

import EDU.oswego.cs.dl.util.concurrent.FIFOSemaphore;
import EDU.oswego.cs.dl.util.concurrent.Semaphore;

/**
 * image operation worker.
 * 
 * @author casties
 *  
 */
public abstract class DigilibWorker {

	protected static Logger logger = Logger.getLogger(DigilibWorker.class);

	private static int runningThreads = 0;

	private static int waitingThreads = 0;

	public static Semaphore lock = new FIFOSemaphore(1);

	protected boolean busy = false;

	protected Exception error;

	/**
	 * @param job
	 */
	public DigilibWorker() {
		super();
		busy = true;
		error = null;
	}

	public abstract void work() throws Exception;

	/**
	 * Do the work.
	 */
	public void run() {
		logger.debug((++waitingThreads) + " waiting threads");
		try {
			lock.acquire();
			waitingThreads--;
		} catch (InterruptedException e) {
			error = e;
			busy = false;
			waitingThreads--;
			return;
		}
		logger.debug((++runningThreads) + " running threads");
		try {
			work();
		} catch (Exception e) {
			error = e;
			logger.error(e);
		}
		busy = false;
		runningThreads--;
		lock.release();
	}

	
	/** Returns the name of this thread.
	 * 
	 * @return
	 */
	public String getName() {
		return Thread.currentThread().getName();
	}
	
	/**
	 * @return Returns the busy.
	 */
	public boolean isBusy() {
		return busy;
	}

	/**
	 * returns if an error occurred.
	 * 
	 * @return
	 */
	public boolean hasError() {
		return (error != null);
	}

	/**
	 * @return Returns the error.
	 */
	public Exception getError() {
		return error;
	}

	/**
	 * @return Returns the lock.
	 */
	public static Semaphore getLock() {
		return lock;
	}

	/**
	 * @param lock
	 *            The lock to set.
	 */
	public static void setLock(Semaphore lock) {
		DigilibWorker.lock = lock;
	}
	
	/** The number of currently running threads (approximate).
	 * @return
	 */
	public static int getNumRunning() {
		return runningThreads;
	}

	/** The number of currently waiting threads (approximate).
	 * @return
	 */
	public static int getNumWaiting() {
		return waitingThreads;
	}
}
