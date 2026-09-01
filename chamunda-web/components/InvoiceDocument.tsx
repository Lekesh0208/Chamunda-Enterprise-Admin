import Image from "next/image";
import { COMPANY, TERMS } from "@/lib/constants";
import { formatINR, numberToWordsIndian } from "@/lib/calculations";
import type { Client, Invoice, Totals } from "@/lib/types";

// Renders the tax invoice pixel-for-pixel matching the original LibreOffice
// layout: same fields, same order, same section structure. Used both for
// the on-screen live preview and for printing/PDF - one source of truth,
// so the two can never quietly drift apart.
export default function InvoiceDocument({
  invoice,
  client,
  consignee,
  totals,
}: {
  invoice: Invoice;
  client?: Client;
  consignee?: Client;
  totals: Totals;
}) {
  const rows = [...invoice.line_items];
  const BLANK_ROW = { description: "", hsn: "", unit: "", qty: "", rate: "" };
  while (rows.length < 2) rows.push(BLANK_ROW);

  return (
    <div style={{ fontFamily: '"Times New Roman", serif', maxWidth: "900px", margin: "0 auto" }}>
      <table className="w-full border-collapse text-sm" style={{ border: "1.5px solid black" }}>
        <tbody>
          <tr>
            <td colSpan={8} className="py-2 px-3 border-b-2 border-black">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="Chamunda Enterprise" width={220} height={124} style={{ height: "60px", width: "auto" }} priority />
                <div className="text-3xl font-bold">
                  <span className="text-red-700">CHAMUNDA</span> ENTERPRISE
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={8} className="px-3 py-1 text-xs border-b-2 border-black font-semibold">
              Works : {COMPANY.address}
              <br />
              GSTIN/UIN : {COMPANY.gstin} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; E-mail : {COMPANY.email}
            </td>
          </tr>
          <tr>
            <td colSpan={8} className="text-center font-bold text-lg py-1 border-b-2 border-black" style={{ background: "#f2d4d4" }}>
              TAX INVOICE
            </td>
          </tr>
          <tr>
            <td colSpan={4} className="border-r-2 border-b border-black p-2 align-top">
              <div className="font-bold">Buyer (Bill to)</div>
              <div className="font-bold mt-[2px]">{client ? client.firm_name : "-"}</div>
              <div>{client ? client.address : ""}</div>
              <div className="mt-[2px]">GSTIN/UIN :- {client ? client.gstin : ""}</div>
              <div>State Name :- {client ? client.state : ""}</div>
              <div className="mt-[2px]">Contact person :- {client ? client.contact_person : ""}</div>
              <div>Contact no. :- {client ? client.contact_no : ""}</div>
            </td>
            <td colSpan={2} className="border-r border-b border-black p-2 align-top text-center">
              <div className="font-bold">Invoice No :</div>
              <div>{invoice.invoice_no}</div>
              <div className="font-bold mt-[5px]">Buyer&apos;s Order No :</div>
              <div>{invoice.buyer_order_no || "-"}</div>
              <div className="font-bold mt-[5px]">Delivery Challan No:</div>
              <div>{invoice.delivery_challan_no || "-"}</div>
            </td>
            <td colSpan={2} className="border-b border-black p-2 align-top text-center">
              <div className="font-bold">Invoice Date :</div>
              <div>{invoice.date}</div>
              <div className="font-bold mt-[5px]">Terms of Payments</div>
              <div>{invoice.terms_of_payment || "-"}</div>
              <div className="font-bold mt-[5px]">Dated</div>
              <div>{invoice.dated || "-"}</div>
            </td>
          </tr>
          <tr>
            <td colSpan={4} className="border-r-2 border-b-2 border-black p-2 align-top">
              <div className="font-bold">Consignee (Shipment to)</div>
              <div className="font-bold mt-[2px]">{consignee ? consignee.firm_name : "-"}</div>
              <div>{consignee ? consignee.address : ""}</div>
              <div className="mt-[2px]">GSTIN/UIN :- {consignee ? consignee.gstin : ""}</div>
              <div>State Name :- {consignee ? consignee.state : ""}</div>
              <div className="mt-[2px]">Contact person :- {consignee ? consignee.contact_person : ""}</div>
              <div>Contact no. :- {consignee ? consignee.contact_no : ""}</div>
            </td>
            <td colSpan={2} className="border-r border-b-2 border-black p-2 align-top text-center">
              <div className="font-bold">Dispatched Through</div>
              <div>{invoice.dispatched_through || "NA"}</div>
              <div className="font-bold mt-[5px]">LR-RR No.</div>
              <div>{invoice.lr_rr_no || "NA"}</div>
            </td>
            <td colSpan={2} className="border-b-2 border-black p-2 align-top text-center">
              <div className="font-bold">Destination</div>
              <div>&nbsp;</div>
              <div className="font-bold mt-[5px]">Motor Vehicle No.</div>
              <div>{invoice.motor_vehicle_no || "NA"}</div>
            </td>
          </tr>
          <tr>
            <td colSpan={8} className="border-b-2 border-black p-2 text-center">
              <span className="font-bold">Terms of Delivery : </span>Ex Works
            </td>
          </tr>
          <tr style={{ background: "#f2d4d4" }}>
            <td className="border-r border-b-2 border-black p-1.5 font-bold text-center w-10">Sr.</td>
            <td className="border-r border-b-2 border-black p-1.5 font-bold text-center">Description of Goods</td>
            <td className="border-r border-b-2 border-black p-1.5 font-bold text-center w-20">HSN Code</td>
            <td className="border-r border-b-2 border-black p-1.5 font-bold text-center w-16">Quantity</td>
            <td className="border-r border-b-2 border-black p-1.5 font-bold text-center w-20">Rate</td>
            <td className="border-r border-b-2 border-black p-1.5 font-bold text-center w-14">Unit</td>
            <td colSpan={2} className="border-b-2 border-black p-1.5 font-bold text-center w-24">Amount</td>
          </tr>
          {rows.map((li, idx) => (
            <tr key={idx} style={{ height: "26px" }}>
              <td className="border-r border-black p-1.5 text-center">{li.description ? idx + 1 : ""}</td>
              <td className="border-r border-black p-1.5">{li.description}</td>
              <td className="border-r border-black p-1.5 text-center">{li.hsn}</td>
              <td className="border-r border-black p-1.5 text-center">{li.qty}</td>
              <td className="border-r border-black p-1.5 text-right">{li.rate ? Number(li.rate).toFixed(2) : ""}</td>
              <td className="border-r border-black p-1.5 text-center">{li.unit}</td>
              <td colSpan={2} className="p-1.5 text-right">
                {li.description && li.qty ? formatINR((Number(li.qty) || 0) * (Number(li.rate) || 0)).replace("\u20B9 ", "") : ""}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={6} className="border-r border-t-2 border-black p-[4px_6px]"></td>
            <td colSpan={2} className="border-t-2 border-black p-[4px_6px] text-right font-medium">{totals.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={6} className="border-r border-black p-[4px_6px] text-right italic">Packing &amp; Forwarding Charges</td>
            <td colSpan={2} className="border-black p-[4px_6px] text-right">{totals.packing.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={6} className="border-r border-black p-[4px_6px] text-right italic">Freight &amp; Loading Charges</td>
            <td colSpan={2} className="border-black p-[4px_6px] text-right">{totals.freight.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={6} className="border-r border-black p-[4px_6px] text-right italic">Sales Tax - SGST (9%)</td>
            <td colSpan={2} className="border-black p-[4px_6px] text-right">{totals.sgst.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={6} className="border-r border-black p-[4px_6px] text-right italic">Central Tax - CGST (9%)</td>
            <td colSpan={2} className="border-black p-[4px_6px] text-right">{totals.cgst.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={6} className="border-r border-black p-[4px_6px] text-right italic">IGST</td>
            <td colSpan={2} className="border-black p-[4px_6px] text-right">{totals.igst.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={6} className="border-r border-black p-[4px_6px] text-right italic">Rounding off</td>
            <td colSpan={2} className="border-black p-[4px_6px] text-right">{totals.roundOff.toFixed(2)}</td>
          </tr>
          <tr style={{ background: "#f2d4d4" }}>
            <td colSpan={6} className="border-r-2 border-black p-[4px_6px] text-right font-bold">T o t a l &hellip;&hellip;</td>
            <td colSpan={2} className="border-black p-[4px_6px] text-right font-bold">{formatINR(totals.total)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="border-r-2 border-b-2 border-black p-[4px_6px] font-bold">Total Amount in Words:-</td>
            <td colSpan={5} className="border-b-2 border-black p-[4px_6px] italic">Rupees {numberToWordsIndian(totals.total)} Only</td>
          </tr>
          <tr>
            <td colSpan={4} className="border-r-2 border-b border-black p-2 align-top leading-tight">
              <div className="font-bold text-center border-b border-black pb-1 mb-1">Declaration</div>
              <div className="font-bold">Terms &amp; Conditions :-</div>
              {TERMS.map((t, i) => (
                <div key={i}>({i + 1}) {t}</div>
              ))}
            </td>
            <td colSpan={4} className="border-b border-black p-2 align-top leading-tight">
              <div className="font-bold text-center border-b border-black pb-1 mb-1">Company&apos;s Bank Details</div>
              <div><span className="font-bold">Bank &amp; Branch Name</span> : {COMPANY.bank}, {COMPANY.branch}</div>
              <div><span className="font-bold">A/c No.</span> : {COMPANY.accNo}</div>
              <div><span className="font-bold">IFS Code</span> : {COMPANY.ifsc}</div>
              <div className="text-center font-bold mt-[10px]">For CHAMUNDA ENTERPRISE</div>
              <div className="text-center mt-[16px]">Authorised Signatory</div>
            </td>
          </tr>
          <tr>
            <td colSpan={8} className="text-center italic font-semibold py-1" style={{ background: "#f2d4d4" }}>
              SUBJECT TO AHMEDABAD JURISDICTION
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
