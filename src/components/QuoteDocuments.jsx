import { PRICING_CONFIG, FREQUENCIES, ANCILLARY_PRICING, ANCILLARY_USAGE, MODULE_SERVICES, USAGE_RATE_SHEET, SHIPPING_RATE_SHEET, JURISDICTION_FEE_PER_LOCATION, BENEFIT_EDI_MIN, formatMoney, formatDate } from '../constants/pricing';
import { Icon } from './Icons';

function DiscountMarker({ moduleKey, discountPercent, discountOptOut }) {
  if (discountPercent <= 0 || discountOptOut[moduleKey]) return null;
  return <span className="text-emerald-600 font-black ml-1" aria-label="Included in recurring discount">*</span>;
}

// One document renderer shared by the original UI and the Codex workspace.
export default function QuoteDocuments({ clientName, quoteDate, employeeCount, frequency, sCorpMode, totals, clientFacing, activeModuleCount, benefitEdi, stateTaxId, pytd, selectedAncillary, calculateSCorpCost, selectedModules, calculateModuleCost, formatHeadcount, additionalJurisdictions, activeAncillaryPricingCount, stateTaxIdTotal, pytdTotal, benefitEdiRecurring, benefitEdiTotal, discountPercent, perEmployeeDelta, modulesAtMinimum, annualFees, showRepInfo, repName, repPhone, repEmail, activeAncillaryUsageCount, discountOptOut }) {
  return (
        <>
        {/* Quote Preview / Print Sheet */}
        <section className="bg-white shadow-xl border border-stone-200 rounded-2xl overflow-hidden max-w-4xl mx-auto print-container print-page-fill">

          {/* Quote Header */}
          <div className="bg-brand-navy text-white p-6 quote-header">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h1 className="text-xl font-bold font-display tracking-tight">Creative Planning Payroll</h1>
                <div className="w-10 h-0.5 bg-brand-gold mt-1.5 mb-3"></div>
                <p className="opacity-70 text-[10px] uppercase tracking-widest">Quote Prepared For</p>
                <h2 className="text-lg font-bold mt-0.5 font-display">
                  {clientName || <span className="opacity-40 italic">[Client Name]</span>}
                </h2>
              </div>
              <div className="text-right flex items-start gap-6">
                <div>
                  <div className="text-[10px] opacity-70 uppercase tracking-wider">Date Issued</div>
                  <div className="font-semibold mt-0.5">{formatDate(quoteDate)}</div>
                </div>
                <div className="bg-[#00617f] px-4 py-3 rounded-lg text-left">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="flex items-center gap-1.5 mb-0.5 justify-center">
                        <Icon.Users className="w-3 h-3 text-white/70" />
                        <span className="text-[9px] uppercase tracking-wider text-white/70">Employees</span>
                      </div>
                      <div className="text-lg font-bold">{employeeCount}</div>
                    </div>
                    <div className="w-px h-8 bg-white/30"></div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon.Calendar className="w-3 h-3 text-white/70" />
                        <span className="text-[9px] uppercase tracking-wider text-white/70">Frequency</span>
                      </div>
                      <div className="text-sm font-semibold">{FREQUENCIES[frequency].label}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quote Body */}
          <div className="p-8 flex flex-col quote-body">
            <div className="flex-1">
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-brand-navy text-left text-[10px] font-bold text-brand-navy uppercase tracking-widest">
                  <th className="pb-3 pl-2">Service Module</th>
                  <th className="pb-3 text-right">{sCorpMode ? (totals.sCorpPeriodLabel === 'quarter' ? 'Per Quarter' : totals.sCorpPeriodLabel === 'year' ? 'Annual' : 'Per Payroll') : 'Per Payroll'}</th>
                  {!clientFacing &&<th className="pb-3 text-right">Annual Est.</th>}
                  <th className="pb-3 text-right pr-2">Setup Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {/* Empty state — no modules selected in standard mode */}
                {!sCorpMode && activeModuleCount === 0 && !benefitEdi.enabled && !stateTaxId.enabled && !pytd.enabled && Object.values(selectedAncillary).every(v => !v) && (
                  <tr>
                    <td colSpan={clientFacing ? 3 : 4} className="py-10 text-center">
                      <div className="text-slate-400 text-sm italic">
                        No services selected yet.<br />
                        <span className="text-[11px] text-slate-300">Choose a service module on the right to start building this quote.</span>
                      </div>
                    </td>
                  </tr>
                )}
                {/* S-Corp mode: single row */}
                {sCorpMode ? (() => {
                  const sc = calculateSCorpCost();
                  return (
                    <tr className="text-sm">
                      <td className="py-4 pl-2">
                        <div className="font-bold text-slate-800">Owner-Only S-Corp Payroll</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {sc.periodLabel === 'quarter'
                            ? `Flat rate: ${formatMoney(sc.perPeriod)}/quarter`
                            : sc.periodLabel === 'year'
                            ? `Flat rate: ${formatMoney(sc.perPeriod)}/year`
                            : `Base: ${formatMoney(sc.perPeriod)}/payroll`
                          }
                        </div>
                      </td>
                      <td className="py-4 text-right font-semibold text-slate-700">
                        {formatMoney(sc.perPeriod)}
                      </td>
                      {!clientFacing && (
                        <td className="py-4 text-right text-slate-600">
                          {formatMoney(sc.annual)}
                        </td>
                      )}
                      <td className="py-4 text-right text-slate-600 pr-2">
                        {sc.setup > 0 ? formatMoney(sc.setup) : '\u2014'}
                      </td>
                    </tr>
                  );
                })() : (
                <>
                {/* Standard mode: all modules */}
                {Object.values(PRICING_CONFIG).map((module) => {
                  if (!selectedModules[module.id]) return null;
                  const costs = calculateModuleCost(module.id);

                  return (
                    <tr key={module.id} className="text-sm">
                      <td className="py-4 pl-2">
                        <div className="font-bold text-slate-800">{module.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {costs.rates.base > 0
                            ? `Rates: Base ${formatMoney(costs.rates.base)} + ${formatMoney(costs.rates.pepm)}/emp${formatHeadcount(costs)}${costs.isMinApplied ? ` (Min ${formatMoney(costs.rates.min)})` : ''}`
                            : `Rate: ${formatMoney(costs.rates.pepm)}/emp${formatHeadcount(costs)}${costs.isMinApplied ? ` (Min ${formatMoney(costs.rates.min)})` : ''}`
                          }
                        </div>
                        {module.id === 'payroll' && !sCorpMode && (
                          <div className="text-[10px] text-brand-navy/60 font-medium mt-0.5">
                            + New Hire Reporting: $3/New Hire
                          </div>
                        )}
                        {module.id === 'payroll' && additionalJurisdictions > 0 && (
                          <div className="text-[10px] text-brand-navy/60 font-medium mt-0.5">
                            + Additional Tax Jurisdictions: {additionalJurisdictions} × {formatMoney(JURISDICTION_FEE_PER_LOCATION)} = {formatMoney(additionalJurisdictions * JURISDICTION_FEE_PER_LOCATION)}/payroll
                          </div>
                        )}
                        {costs.isMinApplied && (
                          <span className="inline-block mt-1 text-[9px] text-brand-gold font-bold uppercase tracking-wider">
                            ★ Minimum Applied
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right font-semibold text-slate-700">
                        {formatMoney(costs.perPayroll)}<DiscountMarker discountPercent={discountPercent} discountOptOut={discountOptOut} moduleKey={module.id} />
                      </td>
                      {!clientFacing &&(
                        <td className="py-4 text-right text-slate-600">
                          {formatMoney(costs.annual)}
                        </td>
                      )}
                      <td className="py-4 text-right text-slate-600 pr-2">
                        {costs.setup > 0 ? formatMoney(costs.setup) : '\u2014'}
                      </td>
                    </tr>
                  );
                })}

                {/* Ancillary per-payroll services (included in totals, hidden in S-Corp) */}
                {!sCorpMode && activeAncillaryPricingCount > 0 && (
                  <tr>
                    <td colSpan={clientFacing ? 3 : 4} className="pt-4 pb-1 pl-2">
                      <span className="text-[9px] font-bold text-brand-navy/60 uppercase tracking-widest">Recurring Add-ons</span>
                    </td>
                  </tr>
                )}
                {!sCorpMode && Object.values(ANCILLARY_PRICING).map((svc) => {
                  if (!selectedAncillary[svc.id]) return null;
                  const costs = calculateModuleCost(svc.id, ANCILLARY_PRICING);
                  return (
                    <tr key={svc.id} className="text-sm">
                      <td className="py-3 pl-2">
                        <div className="font-bold text-slate-800">{svc.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {svc.monthlyBilling && svc.monthlyFlat !== undefined
                            ? `Rate: ${formatMoney(svc.monthlyFlat)}/month · flat · Billed monthly`
                            : (
                              `Rate: ${formatMoney(costs.rates.pepm)}/${svc.monthlyBilling ? 'user' : 'emp'}${formatHeadcount(costs)}`
                              + (costs.isMinApplied ? ` (Min ${formatMoney(costs.rates.min)})` : '')
                              + (svc.monthlyBilling ? ' · Billed monthly' : '')
                            )
                          }
                        </div>
                        {costs.isMinApplied && (
                          <span className="inline-block mt-1 text-[9px] text-brand-gold font-bold uppercase tracking-wider">
                            ★ Minimum Applied
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-700">
                        {formatMoney(costs.perPayroll)}<DiscountMarker discountPercent={discountPercent} discountOptOut={discountOptOut} moduleKey={svc.id} />
                      </td>
                      {!clientFacing && (
                        <td className="py-3 text-right text-slate-600">
                          {formatMoney(costs.annual)}
                        </td>
                      )}
                      <td className="py-3 text-right text-slate-600 pr-2">
                        {costs.setup > 0 ? formatMoney(costs.setup) : '\u2014'}
                      </td>
                    </tr>
                  );
                })}
                </>)}

                {/* State Tax ID Application (Per Agency) */}
                {stateTaxId.enabled && (
                  <tr className="text-sm border-t border-stone-100">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-slate-800">State Tax ID Application (Per Agency)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {stateTaxId.quantity} {parseInt(stateTaxId.quantity) === 1 ? 'ID' : 'IDs'} × $250
                      </div>
                    </td>
                    <td className="py-3 text-right text-slate-300">{'\u2014'}</td>
                    {!clientFacing && <td className="py-3 text-right text-slate-300">{'\u2014'}</td>}
                    <td className="py-3 text-right font-semibold text-slate-700 pr-2">
                      {formatMoney(stateTaxIdTotal)}
                    </td>
                  </tr>
                )}

                {/* Payroll Year-to-Date Loading (PYTD) */}
                {pytd.enabled && pytdTotal > 0 && (
                  <tr className="text-sm border-t border-stone-100">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-slate-800">Payroll Year-to-Date Loading (PYTD)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {(parseFloat(pytd.hours) || 0) > 0 && `${pytd.hours} hr × $150`}
                        {(parseFloat(pytd.hours) || 0) > 0 && (parseInt(pytd.statements) || 0) > 0 && ' + '}
                        {(parseInt(pytd.statements) || 0) > 0 && `${pytd.statements} statements × $0.10`}
                      </div>
                    </td>
                    <td className="py-3 text-right text-slate-300">{'—'}</td>
                    {!clientFacing && <td className="py-3 text-right text-slate-300">{'—'}</td>}
                    <td className="py-3 text-right font-semibold text-slate-700 pr-2">
                      {formatMoney(pytdTotal)}
                    </td>
                  </tr>
                )}

                {/* Benefit Integration (EDI) */}
                {benefitEdi.enabled && (
                  <tr className="text-sm border-t border-stone-100">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-slate-800">Benefit Integration (EDI){benefitEdi.cobraBundle ? ' + COBRA Bundle' : ''}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {`Rate: ${formatMoney(benefitEdiRecurring.baseRate)}/emp × ${employeeCount} employees`}{benefitEdiRecurring.isMinApplied ? ` (Min ${formatMoney(BENEFIT_EDI_MIN)})` : ''}
                      </div>
                      {benefitEdiTotal > 0 && (
                        <div className="text-[10px] text-brand-navy/60 font-medium mt-0.5">
                          + Implementation: {(parseInt(benefitEdi.feeds) || 0) === 1
                            ? `1 feed × $1,195`
                            : `1st feed $1,195 + ${(parseInt(benefitEdi.feeds) || 0) - 1} additional × $995`}
                        </div>
                      )}
                      {benefitEdiRecurring.isMinApplied && (
                        <span className="inline-block mt-1 text-[9px] text-brand-gold font-bold uppercase tracking-wider">
                          ★ Minimum Applied
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-700">
                      {formatMoney(benefitEdiRecurring.perPayroll)}<DiscountMarker discountPercent={discountPercent} discountOptOut={discountOptOut} moduleKey="benefitEdi" />
                    </td>
                    {!clientFacing && (
                      <td className="py-3 text-right text-slate-600">
                        {formatMoney(benefitEdiRecurring.annual)}
                      </td>
                    )}
                    <td className="py-3 text-right font-semibold text-slate-700 pr-2">
                      {benefitEdiTotal > 0 ? formatMoney(benefitEdiTotal) : '—'}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-brand-navy">
                {/* Discount rows (not in S-Corp mode) */}
                {!sCorpMode && discountPercent > 0 && (
                  <>
                    <tr>
                      <td className="pt-4 pl-2 font-semibold text-slate-400 text-sm">Subtotal</td>
                      <td className="pt-4 text-right font-semibold text-slate-400 text-sm">
                        {formatMoney(totals.subtotalPerPayroll)}
                      </td>
                      {!clientFacing &&(
                        <td className="pt-4 text-right font-semibold text-slate-400 text-sm">
                          {formatMoney(totals.subtotalAnnual)}
                        </td>
                      )}
                      <td className="pt-4 pr-2 text-right text-slate-300 text-sm">{'\u2014'}</td>
                    </tr>
                    <tr className="border-b border-stone-200">
                      <td className="py-2 pl-2 font-semibold text-emerald-600 text-sm">
                        Discount ({discountPercent}%)
                        <span className="text-[10px] font-normal text-emerald-500/70 italic ml-1">(towards applicable modules with <span className="text-emerald-600 font-bold">*</span>)</span>
                      </td>
                      <td className="py-2 text-right font-semibold text-emerald-600 text-sm">
                        &minus; {formatMoney(totals.discountPerPayroll)}
                      </td>
                      {!clientFacing &&(
                        <td className="py-2 text-right font-semibold text-emerald-600 text-sm">
                          &minus; {formatMoney(totals.discountAnnual)}
                        </td>
                      )}
                      <td className="py-2 pr-2 text-right text-slate-300 text-sm">{'\u2014'}</td>
                    </tr>
                  </>
                )}

                {/* Total row */}
                <tr>
                  <td className="pt-4 pb-4 pl-2 font-bold text-brand-navy">TOTAL ESTIMATE</td>
                  <td className="pt-4 pb-4 text-right font-bold text-brand-navy text-lg">
                    {formatMoney(totals.finalPerPayroll)}
                  </td>
                  {!clientFacing &&(
                    <td className="pt-4 pb-4 text-right font-bold text-brand-navy">
                      {formatMoney(totals.finalAnnual)}
                    </td>
                  )}
                  <td className="pt-4 pb-4 pr-2 text-right font-bold text-brand-navy">
                    {formatMoney(totals.totalSetup)}
                  </td>
                </tr>

                {/* Per-employee delta caption + minimum explanation */}
                {(perEmployeeDelta.up > 0 || perEmployeeDelta.down > 0 || modulesAtMinimum.length > 0) && (
                  <tr>
                    <td colSpan={clientFacing ? 3 : 4} className="pb-3 pl-2 text-[10px] text-slate-500 italic leading-snug">
                      <div>
                        <span className="font-semibold text-slate-600 not-italic">Per-employee adjustment (approx.):</span>{' '}
                        +{formatMoney(perEmployeeDelta.up)} per added employee
                        {' / '}&minus;{formatMoney(perEmployeeDelta.down)} per terminated employee
                        <span className="text-slate-400"> · per payroll</span>
                      </div>
                      {modulesAtMinimum.length > 0 && (
                        <div className="mt-1 text-slate-500">
                          <span className="text-brand-gold font-bold">★</span>{' '}
                          {modulesAtMinimum.map(m => m.name).join(' and ')}{' '}
                          {modulesAtMinimum.length === 1 ? 'is' : 'are'} currently at
                          {modulesAtMinimum.length === 1 ? ' its minimum' : ' their minimums'}
                          {' — adding employees won’t increase '}
                          {modulesAtMinimum.length === 1 ? 'this fee' : 'those fees'}
                          {' until '}
                          {modulesAtMinimum.map((m, i) => (
                            <span key={i}>
                              {i > 0 && (i === modulesAtMinimum.length - 1 ? ' and ' : ', ')}
                              <span className="font-semibold text-slate-600 not-italic">~{m.unlockAt}</span> ({m.name.replace(/\s*\(.*\)/, '')})
                            </span>
                          ))}
                          {' employees.'}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
            </div>

            {/* Annual Fees (Year-End) */}
            {annualFees.items.length > 0 && (
              <div className="mb-8 annual-fees-block">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-stone-200">
                  <h3 className="text-[11px] font-bold text-brand-navy uppercase tracking-widest">Annual Fees (Year-End Processing)</h3>
                  <span className="text-[10px] text-slate-400 italic">Billed separately at year-end</span>
                </div>
                <div className="space-y-1.5">
                  {annualFees.items.map((item, idx) => (
                    <div key={idx} className="flex items-baseline justify-between text-sm">
                      <div className="flex-1 pr-3">
                        <div className="font-semibold text-slate-800">{item.label}</div>
                        <div className="text-[10px] text-slate-400">{item.detail}</div>
                      </div>
                      <div className="font-semibold text-slate-700 whitespace-nowrap">{formatMoney(item.total)}</div>
                    </div>
                  ))}
                  {annualFees.items.length > 1 && (
                    <div className="flex items-baseline justify-between text-sm pt-2 mt-1 border-t border-stone-200">
                      <div className="font-bold text-brand-navy">Total Annual Fees</div>
                      <div className="font-bold text-brand-navy">{formatMoney(annualFees.grandTotal)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* S-Corp: inline services on same page (print only merges, screen shows separately) */}
            {sCorpMode && clientFacing && (
              <div className="hidden print-scorp-services mt-4 pt-4 border-t border-stone-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-brand-gold rounded-full"></div>
                  <h3 className="text-xs font-bold text-brand-navy uppercase tracking-widest">Services Included</h3>
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 ml-3">
                  {MODULE_SERVICES.scorp.services.map((service, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[10px] text-slate-600">
                      <span className="text-brand-gold mt-0.5 flex-shrink-0">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="leading-snug">{service}</span>
                    </li>
                  ))}
                </ul>
                {showRepInfo && (repName || repPhone || repEmail) && (
                  <div className="mt-3 pt-3 border-t border-stone-100 text-center">
                    <p className="text-[10px] text-slate-500 mb-1">Contact your Creative Planning Payroll representative to get started.</p>
                    {repName && <p className="text-xs font-bold text-brand-gold">{repName}</p>}
                    {repPhone && <p className="text-[10px] font-semibold text-brand-gold">{repPhone}</p>}
                    {repEmail && <p className="text-[10px] font-semibold text-brand-gold">{repEmail}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Usage-based, T&C, and footer kept together in print */}
            <div className="print-keep-together">
              {/* Usage-Based Services (informational only, hidden in S-Corp) */}
              {!sCorpMode && activeAncillaryUsageCount > 0 && (
                <div className="mt-6 pt-4 border-t border-stone-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Additional Usage-Based Services</p>
                  <p className="text-[9px] text-slate-400 mb-2 italic">Fees incurred when utilized — not included in totals above.</p>
                  <table className="w-full">
                    <tbody className="divide-y divide-stone-50">
                      {Object.values(ANCILLARY_USAGE).map((svc) => {
                        if (!selectedAncillary[svc.id]) return null;
                        return (
                          <tr key={svc.id} className="text-xs">
                            <td className="py-2 pl-2">
                              <div className="font-semibold text-slate-700">{svc.name}</div>
                            </td>
                            <td className="py-2 text-right text-slate-600 pr-2" colSpan={2}>
                              {svc.rates.map((r, i) => (
                                <div key={i} className="whitespace-nowrap">{r}</div>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Terms & Conditions */}
              <div className="mt-6 pt-4 border-t border-stone-100 text-xs text-slate-400 print-tc">
                <p className="mb-1.5 font-bold text-brand-navy text-[11px] uppercase tracking-wider">Pricing Terms &amp; Conditions</p>
                <p className="leading-relaxed">
                  This estimate is based on <span className="font-bold text-slate-600">{employeeCount} employees</span> processed <span className="font-bold text-slate-600">{FREQUENCIES[frequency].label.toLowerCase()}</span>.
                  Actual billing may vary based on fluctuations in employee count. Setup fees are one-time charges billed at onboarding.
                  Year-end processing fees (W-2, 1094-C/1095-C) are billed separately during their respective filing periods.
                  Prices are subject to change with 30 days written notice. This quote is valid for 30 days from the date of issue.
                </p>
                <p className="leading-relaxed mt-2">
                  <span className="font-bold text-slate-600">Employee Pricing Notice:</span> Per-employee fees per payroll are based on all active employees in the payroll platform, which may differ from the number of employees paid in a given pay period. Active employees who are on leave, have $0 payrolls, or are otherwise not included in a specific payroll run may still be counted toward per-employee billing.
                </p>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex justify-between items-center text-[10px] text-slate-300 print-footer">
                <span>Creative Planning Payroll &bull; Confidential</span>
                <span>Generated {formatDate(quoteDate)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Page 2: Additional Services & Rates (Client Facing Only, separate page in print) */}
        {clientFacing && !sCorpMode && (() => {
          // Build the annual recap. Each row shows the AFTER-DISCOUNT amount so
          // reps can drop the annual figure directly into Salesforce.
          const periods = FREQUENCIES[frequency].periods;
          const factorFor = (id) => (discountPercent > 0 && !discountOptOut[id]) ? (1 - discountPercent / 100) : 1;
          const recap = [];
          Object.values(PRICING_CONFIG).forEach(m => {
            if (selectedModules[m.id]) {
              const c = calculateModuleCost(m.id);
              const f = factorFor(m.id);
              const pp = c.perPayroll * f;
              recap.push({ id: m.id, name: m.name, perPayroll: pp, annual: pp * periods, discounted: f < 1 });
            }
          });
          Object.values(ANCILLARY_PRICING).forEach(s => {
            if (selectedAncillary[s.id]) {
              const c = calculateModuleCost(s.id, ANCILLARY_PRICING);
              const f = factorFor(s.id);
              const pp = c.perPayroll * f;
              recap.push({ id: s.id, name: s.name, perPayroll: pp, annual: pp * periods, monthly: s.monthlyBilling, discounted: f < 1 });
            }
          });
          if (benefitEdi.enabled) {
            const f = factorFor('benefitEdi');
            const pp = benefitEdiRecurring.perPayroll * f;
            recap.push({ id: 'benefitEdi', name: `Benefit Integration (EDI)${benefitEdi.cobraBundle ? ' + COBRA' : ''}`, perPayroll: pp, annual: pp * periods, discounted: f < 1 });
          }
          const finalPP = recap.reduce((s, r) => s + r.perPayroll, 0);
          const finalAnnual = recap.reduce((s, r) => s + r.annual, 0);
          const anyDiscounted = recap.some(r => r.discounted);
          const digitalPosterEnabled = !!selectedAncillary.digitalLaborPoster;

          return (
        <section className="bg-white shadow-xl border border-stone-200 rounded-2xl overflow-hidden max-w-4xl mx-auto mt-10 print-container print-page-break print-services-compact">

          {/* Header — matches Services Included page style */}
          <div className="bg-brand-navy text-white p-8 services-header">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-2xl font-bold font-display tracking-tight">Creative Planning Payroll</h1>
                <div className="w-12 h-0.5 bg-brand-gold mt-2 mb-4"></div>
                <p className="opacity-70 text-xs uppercase tracking-widest">Additional Services &amp; Rates For</p>
                <h2 className="text-xl font-bold mt-1 font-display">
                  {clientName || <span className="opacity-40 italic">[Client Name]</span>}
                </h2>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-70 uppercase tracking-wider">Date Issued</div>
                <div className="font-semibold text-lg mt-0.5">{formatDate(quoteDate)}</div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">

            {/* TOP: Estimated Annual Recap */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-5 bg-brand-navy rounded-full"></div>
                <div>
                  <h3 className="text-base font-bold text-brand-navy font-display">Estimated Annual Recap</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">Recurring commitments — modules signed up for</p>
                </div>
              </div>
              <div className="ml-4 border border-brand-navy/15 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-brand-navy/5">
                    <tr className="text-[10px] uppercase tracking-widest text-brand-navy font-bold">
                      <th className="text-left py-2 px-3">Module / Service</th>
                      <th className="text-right py-2 px-3">Per Payroll</th>
                      <th className="text-right py-2 px-3">Estimated Annual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {recap.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-slate-400 italic text-sm">
                          No services selected yet.
                        </td>
                      </tr>
                    ) : recap.map((r, i) => (
                      <tr key={i} className="tabular-nums">
                        <td className="py-2 px-3 text-slate-700 font-medium">
                          {r.name}
                          {r.monthly && <span className="ml-2 text-[9px] text-slate-400 italic">(billed monthly)</span>}
                          {r.discounted && <span className="ml-1.5 text-emerald-600 font-bold" title={`${discountPercent}% discount applied`}>★</span>}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">{formatMoney(r.perPayroll)}</td>
                        <td className="py-2 px-3 text-right text-brand-navy font-semibold">{formatMoney(r.annual)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-brand-navy bg-brand-navy/5">
                    <tr className="tabular-nums">
                      <td className="py-3 px-3 font-bold text-brand-navy uppercase text-xs tracking-wider">Total Recurring</td>
                      <td className="py-3 px-3 text-right font-bold text-brand-navy">{formatMoney(finalPP)}</td>
                      <td className="py-3 px-3 text-right font-bold text-brand-navy text-lg">{formatMoney(finalAnnual)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 italic mt-2 ml-4">
                Annual estimate = per-payroll × {periods} pay periods per year (frequency: {FREQUENCIES[frequency].label}). Excludes year-end fees and one-time setup.
                {anyDiscounted && (
                  <> Rows marked with <span className="text-emerald-600 font-bold">★</span> include the {discountPercent}% recurring discount; rows without have been opted out.</>
                )}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t-2 border-dashed border-stone-200"></div>

            {/* BOTTOM: Ancillary Rate Sheet — compact grouped layout */}
            <div className="rate-sheet">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-5 bg-brand-gold rounded-full"></div>
                <div>
                  <h3 className="text-base font-bold text-brand-navy font-display">Ancillary Rate Sheet</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">Additional services billed only if used — not included in totals above</p>
                </div>
              </div>

              {/* Unified data table with aligned Amount column */}
              <div className="ml-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-[0.12em] font-bold text-slate-500 border-b-2 border-brand-navy">
                      <th className="text-left py-1 pr-3 w-[22%]">Category</th>
                      <th className="text-left py-1 pr-3">Service</th>
                      <th className="text-right py-1 pr-2 tabular-nums w-[14%]">Amount</th>
                      <th className="text-left py-1 pl-2 w-[28%]">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(() => {
                      // Assemble rows grouped by category, with rowspan for the category cell.
                      const rows = [];

                      // --- Compliance (including Digital Labor Poster) ---
                      const complianceItems = USAGE_RATE_SHEET.filter(it => it.category === 'Compliance');
                      const compTotal = complianceItems.length + 1; // +1 for Digital Labor Poster
                      complianceItems.forEach((item, i) => {
                        rows.push(
                          <tr key={item.id}>
                            {i === 0 && (
                              <td rowSpan={compTotal} className="align-top pt-1 pr-3 border-r-2 border-brand-gold">
                                <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-brand-navy">Compliance</span>
                              </td>
                            )}
                            <td className="py-1 pr-3 text-slate-700 font-medium">
                              {item.name}
                              {item.note && <span className="block text-[10px] text-slate-400 italic leading-tight">{item.note}</span>}
                            </td>
                            <td className="py-1 pr-2 text-right text-brand-navy font-bold tabular-nums whitespace-nowrap">{item.rate}</td>
                            <td className="py-1 pl-2 text-slate-500 text-[11px] whitespace-nowrap">{item.unit}</td>
                          </tr>
                        );
                      });
                      // Digital Labor Poster row
                      rows.push(
                        <tr key="digitalLaborPoster" className={digitalPosterEnabled ? 'bg-brand-gold/10' : ''}>
                          <td className="py-1 pr-3 text-slate-700 font-medium">
                            Digital Labor Law Poster
                            {digitalPosterEnabled && (
                              <span className="ml-2 text-[8px] font-bold uppercase tracking-widest bg-brand-gold text-white px-1.5 py-0.5 rounded align-middle">Enabled</span>
                            )}
                            <span className="block text-[10px] text-slate-400 italic leading-tight">
                              {digitalPosterEnabled ? 'Included in recurring billing (see page 1).' : 'Opt-in — sales rep can enable.'}
                            </span>
                          </td>
                          <td className="py-1 pr-2 text-right text-brand-navy font-bold tabular-nums whitespace-nowrap">{formatMoney(10)}</td>
                          <td className="py-1 pl-2 text-slate-500 text-[11px] whitespace-nowrap">per month · flat</td>
                        </tr>
                      );

                      // --- Payments & Levies ---
                      const paymentItems = USAGE_RATE_SHEET.filter(it => it.category === 'Payments & Levies');
                      paymentItems.forEach((item, i) => {
                        rows.push(
                          <tr key={item.id}>
                            {i === 0 && (
                              <td rowSpan={paymentItems.length} className="align-top pt-1 pr-3 border-r-2 border-brand-gold">
                                <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-brand-navy">Payments &amp; Levies</span>
                              </td>
                            )}
                            <td className="py-1 pr-3 text-slate-700 font-medium">{item.name}</td>
                            <td className="py-1 pr-2 text-right text-brand-navy font-bold tabular-nums whitespace-nowrap">{item.rate}</td>
                            <td className="py-1 pl-2 text-slate-500 text-[11px] whitespace-nowrap">{item.unit}</td>
                          </tr>
                        );
                      });

                      // --- Shipping ---
                      SHIPPING_RATE_SHEET.forEach((s, i) => {
                        // Amount = base if present, else per-item (for USPS which has no base)
                        const showAmount = s.base !== null ? formatMoney(s.base) : formatMoney(s.perItem);
                        const showUnit = s.base !== null
                          ? `base + ${formatMoney(s.perItem)} per item`
                          : 'per item mailed';
                        rows.push(
                          <tr key={s.id}>
                            {i === 0 && (
                              <td rowSpan={SHIPPING_RATE_SHEET.length} className="align-top pt-1 pr-3 border-r-2 border-brand-gold">
                                <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-brand-navy leading-tight block">Shipping</span>
                                <span className="text-[9px] text-slate-400 italic block">per package</span>
                              </td>
                            )}
                            <td className="py-1 pr-3 text-slate-700 font-medium">{s.method}</td>
                            <td className="py-1 pr-2 text-right text-brand-navy font-bold tabular-nums whitespace-nowrap">{showAmount}</td>
                            <td className="py-1 pl-2 text-slate-500 text-[11px] whitespace-nowrap">{showUnit}</td>
                          </tr>
                        );
                      });

                      return rows;
                    })()}
                  </tbody>
                </table>
                <p className="text-[10px] text-slate-400 italic mt-2 leading-tight">
                  These rates apply as services are used and are billed on the payroll invoice for the corresponding period. Base shipping fees apply once per package, plus the item fee per item. Rates subject to change.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-300 mt-6 pt-3 border-t border-stone-100">
              <span>Creative Planning Payroll · Confidential</span>
              <span>Generated {formatDate(quoteDate)}</span>
            </div>
          </div>
        </section>
          );
        })()}

        {/* Page 3: Services Included (Client Facing Only, separate page in print — hidden for S-Corp print) */}
        {clientFacing && (
          <section className={`bg-white shadow-xl border border-stone-200 rounded-2xl overflow-hidden max-w-4xl mx-auto mt-10 print-container print-page-break print-services-compact ${sCorpMode ? 'print-scorp-hide' : ''}`}>

            {/* Services Header */}
            <div className="bg-brand-navy text-white p-8 services-header">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold font-display tracking-tight">Creative Planning Payroll</h1>
                  <div className="w-12 h-0.5 bg-brand-gold mt-2 mb-4"></div>
                  <p className="opacity-70 text-xs uppercase tracking-widest">Services Included For</p>
                  <h2 className="text-xl font-bold mt-1 font-display">
                    {clientName || <span className="opacity-40 italic">[Client Name]</span>}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-70 uppercase tracking-wider">Date Issued</div>
                  <div className="font-semibold text-lg mt-0.5">{formatDate(quoteDate)}</div>
                </div>
              </div>
            </div>

            {/* Services Body */}
            <div className="p-8 print-services-compact">
              <div className="space-y-6">
                {Object.entries(MODULE_SERVICES).map(([key, moduleData]) => {
                  const isSelected = sCorpMode ? (key === 'scorp') : (selectedModules[key] || selectedAncillary[key]);
                  if (!isSelected) return null;
                  const activeServiceModules = sCorpMode
                    ? ['scorp']
                    : Object.keys(MODULE_SERVICES).filter(k => selectedModules[k] || selectedAncillary[k]);
                  const useColumns = activeServiceModules.length === 1;

                  return (
                    <div key={key} className="services-module-group">
                      <div className="flex items-center gap-3 mb-3 services-module-title">
                        <div className="w-1 h-5 bg-brand-gold rounded-full services-accent-bar"></div>
                        <div>
                          <h3 className="text-base font-bold text-brand-navy font-display">{moduleData.name}</h3>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">Services Included</p>
                        </div>
                      </div>
                      <div className="ml-4">
                        <ul className={`grid gap-1.5 services-list ${useColumns ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {moduleData.services.map((service, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-700">
                              <span className="text-brand-gold mt-0.5 flex-shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                              <span className="leading-snug">{service}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-4 border-b border-stone-100 services-divider"></div>
                    </div>
                  );
                })}
              </div>

              {/* Contact + Footer kept together */}
              <div className="print-keep-together">
                <div className="mt-8 bg-brand-navy/5 border border-brand-navy/10 rounded-xl p-6 services-contact">
                  <div className="text-center">
                    <p className="text-sm font-bold text-brand-navy font-display">Ready to get started?</p>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
                      Contact your Creative Planning Payroll representative to discuss your customized solution and begin onboarding.
                    </p>
                    {showRepInfo && (repName || repPhone || repEmail) && (
                      <div className="mt-3 space-y-0.5">
                        {repName && <p className="text-sm font-bold text-brand-gold">{repName}</p>}
                        {repPhone && <p className="text-xs font-semibold text-brand-gold">{repPhone}</p>}
                        {repEmail && <p className="text-xs font-semibold text-brand-gold">{repEmail}</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-3 border-t border-stone-100 flex justify-between items-center text-[10px] text-slate-300 services-footer">
                  <span>Creative Planning Payroll &bull; Confidential</span>
                  <span>Generated {formatDate(quoteDate)}</span>
                </div>
              </div>
            </div>
          </section>
        )}
        </>
  );
}
