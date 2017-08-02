/*
 ** Helper functions for generating FetchXML statements
 */

var XMLHTTPSUCCESS = 200;
var XMLHTTPREADY = 4;

function FetchUtil(sOrg, sServer) {
  this.org = sOrg;
  this.server = sServer;

  if (sOrg == null) {
    if (typeof(ORG_UNIQUE_NAME) != "undefined") {
      this.org = ORG_UNIQUE_NAME;
    }
  }

  if (sServer == null) {
    this.server = window.location.protocol + "//" + window.location.host;
  }
}

FetchUtil.prototype._ExecuteRequest = function (sXml, sMessage, fInternalCallback, fUserCallback) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("POST", this.server + "/XRMServices/2011/Organization.svc/web", (fUserCallback != null));
  xmlhttp.setRequestHeader("Accept", "application/xml, text/xml, */*");
  xmlhttp.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
  xmlhttp.setRequestHeader("SOAPAction", "http://schemas.microsoft.com/xrm/2011/Contracts/Services/IOrganizationService/Execute");

  if (fUserCallback != null) {
    //asynchronous: register callback function, then send the request.
    var crmServiceObject = this;
    xmlhttp.onreadystatechange = function () {
      fInternalCallback.call(crmServiceObject, xmlhttp, fUserCallback)
    };
    xmlhttp.send(sXml);
  } else {
    //synchronous: send request, then call the callback function directly
    xmlhttp.send(sXml);
    return fInternalCallback.call(this, xmlhttp, null);
  }
}

FetchUtil.prototype._HandleErrors = function (xmlhttp) {
  /// <summary>(private) Handles xmlhttp errors</summary>
  if (xmlhttp.status != XMLHTTPSUCCESS) {
    var sError = "Error: " + xmlhttp.responseText + " " + xmlhttp.statusText;
    alert(sError);
    return true;
  } else {
    return false;
  }
}

FetchUtil.prototype.convertFetchXMLDate = function (fxDate) {
  var strDate = fxDate.replace(/-/gi, '/');
  strDate = strDate.replace('T', ' ');

  var objDate = new Date(strDate);
  return objDate;
}

// convert a string amount (eg: "R 2 000.10" to a float "2000.10")
FetchUtil.prototype.convertStringAmountToFloat = function (strAmount) {
  var cents = '';
  var floatAmount = 0;
  if (strAmount != '') {
    var dotPosition = strAmount.lastIndexOf('.');
    if (dotPosition != -1) { //if there are cents entered then strip them out
      var cents = strAmount.slice(dotPosition);
      strAmount = strAmount.slice(0, dotPosition);
    }
    strAmount = strAmount.replace(/\D/g, '') + cents; // remove all non-numeric characters and append cents
    floatAmount = parseFloat(strAmount);
  }
  return floatAmount;
}

FetchUtil.prototype.Fetch = function (sFetchXml, fCallback) {
  /// <summary>Execute a FetchXml request. (result is the response XML)</summary>
  /// <param name="sFetchXml">fetchxml string</param>
  /// <param name="fCallback" optional="true" type="function">(Optional) Async callback function if specified. If left null, function is synchronous </param>

  var request = "<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\">";
  request += "<s:Body>";

  request += '<Execute xmlns="http://schemas.microsoft.com/xrm/2011/Contracts/Services">' + '<request i:type="b:RetrieveMultipleRequest" ' + ' xmlns:b="http://schemas.microsoft.com/xrm/2011/Contracts" ' + ' xmlns:i="http://www.w3.org/2001/XMLSchema-instance">' + '<b:Parameters xmlns:c="http://schemas.datacontract.org/2004/07/System.Collections.Generic">' + '<b:KeyValuePairOfstringanyType>' + '<c:key>Query</c:key>' + '<c:value i:type="b:FetchExpression">' + '<b:Query>';

  request += CrmEncodeDecode.CrmXmlEncode(sFetchXml);

  request += '</b:Query>' + '</c:value>' + '</b:KeyValuePairOfstringanyType>' + '</b:Parameters>' + '<b:RequestId i:nil="true"/>' + '<b:RequestName>RetrieveMultiple</b:RequestName>' + '</request>' + '</Execute>';

  request += '</s:Body></s:Envelope>';

  return this._ExecuteRequest(request, "Fetch", this._FetchCallback, fCallback);
}

FetchUtil.prototype._FetchCallback = function (xmlhttp, callback) {
  ///<summary>(private) Fetch message callback.</summary>
  //xmlhttp must be completed
  if (xmlhttp.readyState != XMLHTTPREADY) {
    return;
  }

  //check for server errors
  if (this._HandleErrors(xmlhttp)) {
    return;
  }

  var resultDoc,
  results,
  entity,
  attribute,
  attributes,
  attributeKey,
  attributeValue,
  attributeType,
  entOSV,
  entRef,
  entCV,
  formattedKey,
  formattedValue;

  resultDoc = $(xmlhttp.responseXML).find("a\\:Entities, Entities");
  results = new Array();

  resultDoc.find("a\\:Entity, Entity").each(function () {
    entity = $(this);
    attributes = new Object();
    entity.first("Attributes").find("a\\:KeyValuePairOfstringanyType, KeyValuePairOfstringanyType").each(function () {
      attribute = $(this);
      attributeKey = attribute.find("b\\:key, key").text();
      attributeValue = attribute.find("b\\:value, value").text();
      attributeType = attribute.find("b\\:value, value").attr("i:type");

      switch (attributeType) {
      case "a:OptionSetValue":
        entOSV = new jsOptionSetValue();
        entOSV.type = attributeType;
        entOSV.value = attribute.find("b\\:value, value").text();
        attributes[attributeKey] = entOSV;
        break;
      case "a:EntityReference":
        entRef = new jsEntityReference();
        entRef.type = attributeType;
        entRef.guid = attribute.find("b\\:value, value").find("a\\:Id, Id").text();
        entRef.logicalName = attribute.find("b\\:value, value").find("a\\:LogicalName, LogicalName").text();
        entRef.name = attribute.find("b\\:value, value").find("a\\:Name, Name").text();
        attributes[attributeKey] = entRef;
        break;
      case "a:AliasedValue":
        entCV = new jsCrmValue();
        entCV.type = attributeType;
        entCV.value = attribute.find("b\\:value, value").find("a\\:Value, Value").text();
        attributes[attributeKey] = entCV;
        break;
      default:
        entCV = new jsCrmValue();
        entCV.type = attributeType;
        entCV.value = attribute.find("b\\:value, value").text();
        attributes[attributeKey] = entCV;
        break;
      }
    });

    // formattedvalues for attributes
    entity.first("a\\:FormattedValues, FormattedValues").find("a\\:KeyValuePairOfstringstring, KeyValuePairOfstringstring").each(function () {
      formattedKey = $(this).find("b\\:key, key").text();
      formattedValue = $(this).find("b\\:value, value").text();
      if (attributes[formattedKey]) {
        attributes[formattedKey].formattedValue = formattedValue;
      }
    });

    results.push({
      guid : entity.children("a\\:Id").text(),
      logicalName : entity.children("a\\:LogicalName").text(),
      attributes : attributes
    });
  });

  //return entities
  if (callback != null)
    callback(results);
  else
    return results;

}

function jsDynamicEntity(gID, sLogicalName) {
  this.guid = gID;
  this.logicalName = sLogicalName;
  this.attributes = new Object();
}

function jsCrmValue(sType, sValue) {
  this.type = sType;
  this.value = sValue;
}

function jsEntityReference(gID, sLogicalName, sName) {
  this.guid = gID;
  this.logicalName = sLogicalName;
  this.name = sName;
  this.type = 'EntityReference';
}

function jsOptionSetValue(iValue, sFormattedValue) {
  this.value = iValue;
  this.formattedValue = sFormattedValue;
  this.type = 'OptionSetValue';
}
