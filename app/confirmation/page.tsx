"use client";

import Link from "next/link";
import { AlertTriangle, Circle, FileCheck, Mail, Printer } from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";
import { BrandLockup } from "@/components/brand-lockup";

export default function ConfirmationPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-[#1E3A5F]">
      <AdvocateNav
        activeItem="workspace"
        showCaseContext
        caseId="#ADV-2047"
        patientName="Marina Rodriguez"
        workspaceHref="/workspace"
        methodologyHref="/#methodology"
        evidenceHref="/evidence"
        supportHref="/status"
        exportHref="/confirmation"
      />

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-8 py-10">
        <header className="mb-10">
          <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-2">
            <Link href="/workspace" className="hover:text-[#1E3A5F]">Workspace</Link>
            <span>/</span>
            <span className="text-[#1E3A5F]">Submission Confirmation</span>
          </div>
          <h1 className="font-serif text-4xl text-[#1E3A5F]">Finalize Submission</h1>
          <p className="text-sm text-[#6B6B6B] mt-2 font-light">Review your appeal packet and confirm the delivery channel to the insurer.</p>
        </header>

        <section className="bg-white border-subtle p-6 mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <FileCheck className="text-2xl text-[#1B5E3F] h-6 w-6" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Packet Content</span>
                <span className="text-xs font-semibold">Internal Appeal Letter + 4 Evidence Attachments</span>
              </div>
            </div>
            <div className="h-10 w-px bg-[#E8E4DF]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Recipient</span>
              <span className="text-xs font-semibold">Anthem Blue Cross | Grievances & Appeals Dept</span>
            </div>
          </div>
          <Link href="/draft" className="text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F] border-b border-[#1E3A5F] pb-0.5 hover:opacity-70">
            Review Documents
          </Link>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="bg-white border-subtle p-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-[#1E3A5F]">Select Submission Method</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="relative flex flex-col p-5 border-2 border-[#1E3A5F] bg-[#FDFCFB] cursor-pointer group">
                  <input type="radio" name="submission_method" className="hidden" defaultChecked />
                  <div className="flex justify-between items-start mb-4">
                    <Printer className="text-2xl text-[#1E3A5F] h-6 w-6" />
                    <div className="w-4 h-4 rounded-full border-4 border-[#1E3A5F] bg-white" />
                  </div>
                  <span className="text-sm font-bold">Digital Fax</span>
                  <p className="text-[11px] text-[#6B6B6B] mt-1 leading-relaxed">Secure transmission to (800) 555-0199. Near-instant confirmation receipt.</p>
                  <div className="mt-4 pt-4 border-t border-[#E8E4DF] flex justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#1B5E3F]">Recommended</span>
                    <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">Free</span>
                  </div>
                </label>

                <label className="relative flex flex-col p-5 border border-[#E8E4DF] bg-white hover:border-[#1E3A5F] transition-colors cursor-pointer group">
                  <input type="radio" name="submission_method" className="hidden" />
                  <div className="flex justify-between items-start mb-4">
                    <Mail className="text-2xl text-[#6B6B6B] group-hover:text-[#1E3A5F] h-6 w-6" />
                    <div className="w-4 h-4 rounded-full border border-[#E8E4DF] bg-white" />
                  </div>
                  <span className="text-sm font-bold">USPS Certified Mail</span>
                  <p className="text-[11px] text-[#6B6B6B] mt-1 leading-relaxed">Physical delivery with signature tracking. 3-5 business days.</p>
                  <div className="mt-4 pt-4 border-t border-[#E8E4DF] flex justify-between">
                    <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">Priority</span>
                    <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">$14.50 Fee</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-white border-subtle p-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-6 text-[#1E3A5F]">Verification & Notifications</h2>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-1.5">Confirmation Email</label>
                  <input type="email" defaultValue="marina.rodriguez@example.com" className="bg-[#F9F8F6] border-subtle p-3 text-xs focus:ring-1 focus:ring-[#1E3A5F] outline-none" />
                </div>
                <div className="flex items-center space-x-3 mt-4">
                  <input type="checkbox" id="sms-notif" className="w-4 h-4 border-[#E8E4DF] text-[#1E3A5F]" defaultChecked />
                  <label htmlFor="sms-notif" className="text-[11px] text-[#4A4A4A]">Send SMS status updates to (555) 012-3456</label>
                </div>
              </div>
            </div>

            <div className="bg-[#FEF2F2] border border-[#FEE2E2] p-5 flex items-start space-x-4">
              <AlertTriangle className="text-xl text-[#B83A3A] mt-0.5 h-5 w-5" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#B83A3A] mb-1">Institutional Warning</span>
                <p className="text-[11px] leading-relaxed text-[#7F1D1D]">
                  Once this appeal is transmitted to the insurer, no further modifications can be made to the claim packet
                  through this interface. Ensure all evidence and clinical rationale are accurate before proceeding.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 pt-4">
              <Link href="/status" className="flex-1 bg-[#1E3A5F] text-white py-4 px-6 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-[#1B5E3F] transition-all text-center">
                Transmit Appeal Packet
              </Link>
              <Link href="/workspace" className="bg-white border border-[#E8E4DF] text-[#6B6B6B] py-4 px-6 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-gray-50 transition-all">
                Return to Workspace
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-[#F9F8F6] border-subtle p-8 sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#1E3A5F]">Delivery Tracker</h2>
                <span className="px-2 py-1 bg-white border border-[#E8E4DF] text-[9px] font-bold uppercase tracking-wider">Pending Transaction</span>
              </div>

              <div className="relative space-y-10 pl-2">
                <div className="status-line" />
                <div className="relative flex items-start space-x-6 z-10">
                  <div className="w-4 h-4 rounded-full bg-[#1E3A5F] flex items-center justify-center ring-4 ring-white">
                    <Circle className="text-[6px] text-white h-1.5 w-1.5 fill-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase text-[#1E3A5F]">Awaiting Confirmation</span>
                    <span className="text-[10px] text-[#6B6B6B]">Verification of case assets and insurer routing.</span>
                    <span className="text-[9px] font-medium text-[#1E3A5F] mt-1">CURRENT STEP</span>
                  </div>
                </div>

                {[
                  ["Transmission Sent", "Packet dispatched via secure digital fax channel."],
                  ["Insurer Acknowledged", "Receipt verification from Anthem routing system."],
                  ["Proof of Delivery", "Institutional confirmation log generated."],
                ].map(([title, body]) => (
                  <div key={title} className="relative flex items-start space-x-6 z-10">
                    <div className="w-4 h-4 rounded-full bg-white border-2 border-[#E8E4DF] flex items-center justify-center ring-4 ring-[#F9F8F6]" />
                    <div className="flex flex-col opacity-40">
                      <span className="text-[11px] font-bold uppercase text-[#6B6B6B]">{title}</span>
                      <span className="text-[10px] text-[#6B6B6B]">{body}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 bg-white border border-[#E8E4DF] p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Est. Delivery Date</span>
                  <span className="text-xs font-semibold">Today, March 16, 2024</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Submission SLA</span>
                  <span className="text-xs font-semibold text-[#1B5E3F]">&lt; 2 Hours</span>
                </div>
                <div className="pt-4 border-t border-[#F3F3F3] flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Tracking ID</span>
                  <span className="text-[10px] font-mono text-[#1E3A5F]">ADV-TXN-99827-BC</span>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-[10px] leading-relaxed text-[#6B6B6B] italic font-light">
                  Delivery tracking is integrated with regulatory oversight systems to ensure insurer compliance with response timelines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-[#E8E4DF] p-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <BrandLockup width={540} height={129} imageClassName="h-[66px] w-auto" />
          </div>
          <div className="flex space-x-12">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-2">Navigation</span>
              <div className="flex space-x-6 text-[10px] font-medium">
                <Link href="/dashboard" className="hover:text-[#1E3A5F]">Dashboard</Link>
                <Link href="/evidence" className="hover:text-[#1E3A5F]">Evidence</Link>
                <Link href="/status" className="hover:text-[#1E3A5F]">Support</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
