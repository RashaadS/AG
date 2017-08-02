/*  Requires: FetchXML Helper Library
 */

var ServerUrl, Org, objFetchUtil

function onLoad() {
    ServerUrl = Xrm.Page.context.getClientUrl();
    Org = Xrm.Page.context.getOrgUniqueName();
    objFetchUtil = new FetchUtil(Org, ServerUrl);

}

function rs_newmobilenumber_OnChange() {
	doDataValidation();
}

function onSave(executionObj) {
        // validation checks
		var saveRecord = doDataValidation();
		
		// dont save record as validation failed
		if (saveRecord == false) {
			executionObj.getEventArgs().preventDefault();
		}
		
		// dont save record as Authorisation validation failed
		var saveRecordAuth = checkAuthorised();
		if (saveRecordAuth == false) {
			executionObj.getEventArgs().preventDefault();
		}
		else {			
			alert("Customer details have successfully been saved.");
		}
}

function checkAuthorised() {
    var authStatus, attrAuthStatus, valAuthStatus;

    authStatus = Xrm.Page.getControl('rs_customerauthorisationstatus');
    if (!authStatus) { // missing control
        return;
    }

    attrAuthStatus = authStatus.getAttribute();
    if (!attrAuthStatus) { // missing attribute
        return;
    }

    valAuthStatus = attrAuthStatus.getValue();
	
	if (valAuthStatus == "100000001") { // Authorised
	
        var userId = Xrm.Page.context.getUserId(); // current logged in user		
		var customerCreatedById = getCustomerCreatedBy(); 
		
		// set guid to use same case and take out curly brackets
		if (userId.replace(/[{}]/g, "").toUpperCase() == customerCreatedById.replace(/[{}]/g, "").toUpperCase()) {
			alert("This user cannot authorise this record. The user who creates the record cannot authorise it.");
			return false;
		}
				
		// change status to inactive ... **** need to call SetRequest (??) command ... use plugin rather
	}
	
    return true;
}

function doDataValidation() {
    var ctlNewMobilenumber, attrNewmobilenumber, newMobilenumber;

    ctlNewMobilenumber = Xrm.Page.getControl('rs_newmobilenumber');
    if (!ctlNewMobilenumber) { // missing control
        return;
    }
	
	attrNewmobilenumber = ctlNewMobilenumber.getAttribute();
	newMobilenumber = attrNewmobilenumber.getValue();
    newMobilenumber = newMobilenumber == null ? "" : newMobilenumber;

	if (newMobilenumber.length != 10) {
		alert("Mobile number must be 10 characters long. Please re-enter value.");
		attrNewmobilenumber.setValue("");
		return false;
	}
	
	if (isNaN(newMobilenumber)) {
		alert("Mobile number must be numeric. Please re-enter value.");
		attrNewmobilenumber.setValue("");
		return false;
	}
	
    return true;
}

function rs_customer_OnChange() {
    var ctrCustomer,
        attrCustomer,
        valCustomer,
		customer;

    ctrCustomer = Xrm.Page.getControl('rs_customer');

    if (!ctrCustomer) { // missing control
        return;
    }

    attrCustomer = ctrCustomer.getAttribute();
    if (!attrCustomer) { // missing attribute
        return;
    }

    valCustomer = attrCustomer.getValue();

    var fetchXml = "<fetch mapping = 'logical'>" +
      "<entity name = 'rs_customer'>" +
      "<attribute name='rs_name' />" +
      "<attribute name='rs_mobilenumber' />" +
      "<attribute name='rs_address' />" +
      "<filter>" +
      "<condition attribute = 'rs_customerid' operator = 'eq' uitype='rs_customer' value = '" + valCustomer[0].id + "' />" +
      "</filter>" +
      "</entity>" +
      "</fetch>";
    customer = objFetchUtil.Fetch(fetchXml);

    var cust_name = customer[0].attributes['rs_name'].value;
    var cust_mobilenumber = customer[0].attributes['rs_mobilenumber'].value;
    var cust_address = customer[0].attributes['rs_address'].value;
	
	Xrm.Page.getAttribute("rs_name1").setValue(cust_name);
	Xrm.Page.getAttribute("rs_mobilenumber").setValue(cust_mobilenumber);
	Xrm.Page.getAttribute("rs_address").setValue(cust_address);
}

function getCustomerCreatedBy() {
    var ctrCustomer,
        attrCustomer,
        valCustomer,
		customer;

    ctrCustomer = Xrm.Page.getControl('rs_customer');

    if (!ctrCustomer) { // missing control
        return;
    }

    attrCustomer = ctrCustomer.getAttribute();
    if (!attrCustomer) { // missing attribute
        return;
    }

    valCustomer = attrCustomer.getValue();

    var fetchXml = "<fetch mapping = 'logical'>" +
      "<entity name = 'rs_customer'>" +
      "<attribute name='rs_name' />" +
      "<attribute name='createdby' />" +
      "<filter>" +
      "<condition attribute = 'rs_customerid' operator = 'eq' uitype='rs_customer' value = '" + valCustomer[0].id + "' />" +
      "</filter>" +
      "</entity>" +
      "</fetch>";
    customer = objFetchUtil.Fetch(fetchXml);
	
	return customer[0].attributes['createdby'].guid;
}