"""Reproduce the journal's figures. Requires Python 3, numpy and matplotlib.

Measured ratios are transcribed from the cited paper's abstract. Other numerical
figures are explicitly illustrative calculations, not QWERTY Labs benchmark results.
"""
from pathlib import Path
import csv
import argparse
import xml.etree.ElementTree as ET
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

parser = argparse.ArgumentParser()
parser.add_argument('--preview-dir', type=Path)
args = parser.parse_args()
if args.preview_dir: args.preview_dir.mkdir(parents=True, exist_ok=True)

OUT = Path(__file__).resolve().parents[1] / 'public/journal/figures'
OUT.mkdir(parents=True, exist_ok=True)
PAPER, INK, GREEN, SAGE, AMBER = '#faf9f5', '#25392e', '#225d47', '#9bb6a1', '#b7894c'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':13,'axes.titlesize':18,'axes.labelsize':13,'xtick.labelsize':12,'ytick.labelsize':12,'text.color':INK,'axes.labelcolor':INK,'xtick.color':INK,'ytick.color':INK,'axes.edgecolor':'#b8c6b8','figure.facecolor':PAPER,'axes.facecolor':PAPER,'text.parse_math':False,'svg.fonttype':'path','svg.hashsalt':'qwerty-labs-journal-2026'})

def base(title,kind):
    fig,ax=plt.subplots(figsize=(10,6.25));fig.subplots_adjust(left=.12,right=.94,bottom=.18,top=.78)
    fig.text(.09,.93,kind.upper(),color=GREEN,fontsize=10,weight='bold',ha='left')
    fig.text(.09,.86,title,fontsize=18,weight='medium',ha='left')
    ax.spines[['top','right']].set_visible(False);ax.grid(axis='y',color='#dce3d8',linewidth=.7,zorder=0);ax.set_axisbelow(True)
    return fig,ax

def save(fig,name,description):
    path=OUT/f'{name}.svg';fig.savefig(path,format='svg',metadata={'Date':None,'Title':description,'Description':description,'Creator':'QWERTY Labs journal figure generator'})
    if args.preview_dir: fig.savefig(args.preview_dir/f'{name}.png', dpi=120)
    plt.close(fig)
    ET.register_namespace('', 'http://www.w3.org/2000/svg');tree=ET.parse(path);root=tree.getroot();root.set('role','img')
    title=ET.Element('{http://www.w3.org/2000/svg}title');title.text=description;root.insert(0,title)
    tree.write(path,encoding='unicode',xml_declaration=True)

def data(name,fields,rows):
    with (OUT/f'{name}.csv').open('w',newline='') as file:
        writer=csv.writer(file);writer.writerow(fields);writer.writerows(rows)

def box(ax,x,y,w,h,label,small=None,color=None):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0.012,rounding_size=0.025',facecolor=color or '#eef2e8',edgecolor='#9fb59f',linewidth=1.1))
    ax.text(x+w/2,y+h*(.60 if small else .5),label,ha='center',va='center',fontsize=13,color=INK,linespacing=1.45)
    if small:ax.text(x+w/2,y+h*.22,small,ha='center',va='center',fontsize=10,color='#52675a')

def arrow(ax,a,b):
    ax.add_patch(FancyArrowPatch(a,b,arrowstyle='-|>',mutation_scale=13,color=GREEN,linewidth=1.4))

# Article 1: all amounts are a hypothetical, reproducible weekly example.
fig,ax=base('The value of time saved, after running costs','Illustrative weekly calculation')
x=np.arange(2);labor=[12000,6300];running=[0,1400]
ax.bar(x,labor,color=GREEN,width=.48,label='Human handling',zorder=3);ax.bar(x,running,bottom=labor,color=AMBER,width=.48,label='AI, operations and amortized setup',zorder=3)
for i,total in enumerate(np.array(labor)+running):ax.text(i,total+350,f'${total:,.0f}',ha='center',fontsize=16)
ax.set_xticks(x,['Baseline','Assisted workflow']);ax.set_ylim(0,14800);ax.set_ylabel('Weekly cost (USD)');ax.set_yticks([0,4000,8000,12000],['$0','$4,000','$8,000','$12,000']);ax.legend(loc='upper right',frameon=False,fontsize=11)
fig.text(.12,.06,'1,000 cases · $30/hour · 20% exceptions · $4,300 illustrative net saving',fontsize=11,color='#52675a')
save(fig,'roi-weekly-cost','Illustrative weekly cost: baseline 12000 dollars; assisted human work 6300 dollars plus 1400 dollars operating and amortized setup cost.')
data('roi-weekly-cost',['workflow','human_cost_usd','running_and_amortized_setup_usd','total_usd','evidence'],[['Baseline',12000,0,12000,'Illustrative'],['Assisted',6300,1400,7700,'Illustrative']])
fig,ax=base('Exception rates change the business case','Illustrative sensitivity analysis')
p=np.linspace(0,.65,131);minutes=7+28*p;speed=24/minutes
ax.plot(p*100,speed,color=GREEN,lw=2.6);ax.axhline(1,color='#8c8f82',ls='--',lw=1);ax.scatter([20],[24/12.6],color=AMBER,s=65,zorder=4);ax.annotate('20% exceptions\n1.90× handling capacity',(20,24/12.6),xytext=(30,2.45),arrowprops={'arrowstyle':'-','color':AMBER},fontsize=12)
ax.set_xlabel('Cases needing exception handling (%)');ax.set_ylabel('Baseline / assisted handling time (×)');ax.set_ylim(.8,3.8);ax.set_xlim(0,65)
fig.text(.12,.06,'Baseline: 24 min/case · Routine path: 7 min · Exception path: 35 min',fontsize=11,color='#52675a')
save(fig,'roi-exception-sensitivity','Illustrative handling speedup decreases as exception rate increases. At 20 percent exceptions, baseline time divided by assisted time is 1.90.')
data('roi-exception-sensitivity',['exception_fraction','assisted_minutes_per_case','handling_capacity_ratio','evidence'],[[round(a,4),round(b,4),round(c,6),'Illustrative'] for a,b,c in zip(p,minutes,speed)])

# Article 2: ideal storage arithmetic, not observed runtime resident memory.
fig,ax=base('Weight precision changes the storage floor','Analytical calculation · 35 billion parameters')
bits=[16,8,4];gb=[35e9*b/8/1e9 for b in bits]
ax.bar(np.arange(3),gb,color=[SAGE,GREEN,AMBER],width=.55,zorder=3)
for i,value in enumerate(gb):ax.text(i,value+2,f'{value:g} GB',ha='center',fontsize=16)
ax.set_xticks(range(3),['16 bits / weight','8 bits / weight','4 bits / weight']);ax.set_ylim(0,85);ax.set_ylabel('Ideal weight bytes (decimal GB)')
fig.text(.12,.06,'Excludes scales, metadata, activations, KV cache and runtime buffers.',fontsize=11,color='#52675a')
save(fig,'model-weight-storage','Ideal weight storage for 35 billion parameters: 70 GB at 16 bits, 35 GB at 8 bits and 17.5 GB at 4 bits. Runtime memory is additional.')
data('model-weight-storage',['parameters','bits_per_weight','ideal_decimal_gb','evidence'],[[35000000000,b,g,'Analytical; not a runtime benchmark'] for b,g in zip(bits,gb)])
fig,ax=base('Capacity lives on storage; active experts move','Conceptual expert-loading architecture');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
box(ax,.02,.36,.27,.39,'SSD / model store','All expert weights')
box(ax,.37,.36,.27,.39,'RAM / VRAM cache','Selected, reusable experts')
box(ax,.73,.36,.24,.39,'Execution','Current token')
arrow(ax,(.30,.55),(.36,.55));arrow(ax,(.65,.55),(.72,.55))
ax.text(.33,.82,'Fetch / prefetch',ha='center',fontsize=11,color=GREEN);ax.text(.69,.25,'Routing chooses\nthe next experts',ha='center',fontsize=12)
fig.text(.12,.06,'A smaller active working set does not remove the model from storage.',fontsize=11,color='#52675a')
save(fig,'expert-loading-path','Conceptual diagram: model weights on SSD are fetched into a RAM or VRAM cache, then used by execution for the current token.')

# Article 3: enforce identity outside the language model.
fig,ax=base('Keep authorization outside the model','Illustrative deployment boundary');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
box(ax,.02,.62,.27,.25,'Verified identity','Tenant + user + role');box(ax,.37,.62,.27,.25,'Policy gateway','Authorize the request');box(ax,.73,.62,.24,.25,'Retrieval','Filter before ranking')
box(ax,.02,.16,.27,.25,'Audit + retention','Redact; set expiry');box(ax,.37,.16,.27,.25,'Tool gateway','Authorize every action');box(ax,.73,.16,.24,.25,'Model runtime','Reason over allowed data')
arrow(ax,(.30,.745),(.36,.745));arrow(ax,(.65,.745),(.72,.745));arrow(ax,(.85,.60),(.85,.43));arrow(ax,(.72,.285),(.65,.285));arrow(ax,(.36,.285),(.30,.285))
fig.text(.12,.06,'Identity and policy are application controls, not instructions delegated to the LLM.',fontsize=11,color='#52675a')
save(fig,'private-ai-boundaries','An illustrative private AI request flows from verified identity through a policy gateway and authorized retrieval to model runtime, an authorized tool gateway and audit retention.')
fig,ax=base('Zero observed failures still leaves uncertainty','Analytical calculation · independent Bernoulli trials')
n=np.logspace(2,5,100);upper=(1-.05**(1/n))*100
ax.plot(n,upper,color=GREEN,lw=2.6);ax.set_xscale('log');ax.set_yscale('log');ax.scatter([1000],[(1-.05**.001)*100],color=AMBER,s=65,zorder=4)
ax.annotate('1,000 independent tests\nUpper bound ≈ 0.30%',(1000,(1-.05**.001)*100),xytext=(2500,.65),fontsize=12,arrowprops={'arrowstyle':'-','color':AMBER})
ax.set_xlabel('Independent tests with zero observed failures');ax.set_ylabel('One-sided 95% upper failure-rate bound (%)');ax.set_xticks([100,1000,10000,100000],['100','1,000','10,000','100,000']);ax.set_yticks([.003,.03,.3,3],['0.003%','0.03%','0.3%','3%'])
fig.text(.12,.06,'This calculation does not certify security or cover correlated adversarial tests.',fontsize=11,color='#52675a')
save(fig,'isolation-test-confidence','Analytical one-sided 95 percent binomial upper bound after zero failures: approximately 0.30 percent for 1000 independent trials. This is not a security certification.')
data('isolation-test-confidence',['independent_trials','upper_failure_fraction_95pct','evidence'],[[int(v),1-.05**(1/int(v)),'Analytical; not a security test result'] for v in [100,1000,10000,100000]])

# Article 4: the diagram is a blueprint; the curve is a calculation.
fig,ax=base('A support request needs a controlled route','Illustrative use-case blueprint');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
labels=[('Authenticate','Bind the account'),('Gather context','Read approved records'),('Check policy','Determine allowed steps'),('Propose action','Confirm intent'),('Execute once','Use an idempotency key'),('Verify + respond','Confirm or hand over')]
coords=[(.02,.61),(.37,.61),(.72,.61),(.72,.17),(.37,.17),(.02,.17)]
for (label,small),(x,y) in zip(labels,coords):box(ax,x,y,.26,.26,label,small)
for a,b in [((.29,.74),(.36,.74)),((.64,.74),(.71,.74)),((.85,.59),(.85,.45)),((.71,.30),(.64,.30)),((.36,.30),(.29,.30))]:arrow(ax,a,b)
fig.text(.12,.06,'Escalate when identity, policy, evidence or execution state is uncertain.',fontsize=11,color='#52675a')
save(fig,'support-controlled-workflow','Illustrative support workflow: authenticate, gather context, check policy, propose action, execute once and verify the outcome, with escalation for uncertainty.')
fig,ax=base('Step success compounds across a workflow','Illustrative probability calculation')
steps=np.arange(1,11)
for prob,color in [(.90,AMBER),(.95,GREEN),(.99,SAGE)]:ax.plot(steps,100*prob**steps,color=color,lw=2.5,marker='o',ms=4,label=f'{prob:.0%} per step')
ax.set_xlabel('Steps requiring successful execution');ax.set_ylabel('All steps succeed (%)');ax.set_xticks(steps);ax.set_ylim(25,103);ax.legend(frameon=False,loc='lower left',fontsize=11)
fig.text(.12,.06,'Assumes independent, equally reliable steps. Real workflows need end-to-end tests.',fontsize=11,color='#52675a')
save(fig,'support-compound-reliability','Illustrative independent step calculation: five steps at 95 percent success each produce 77.4 percent end-to-end success; at 99 percent each they produce 95.1 percent.')
data('support-compound-reliability',['steps','per_step_success','end_to_end_success','evidence'],[[int(k),p,p**k,'Illustrative independent-step model'] for p in [.90,.95,.99] for k in steps])

# Article 5: approximate abstract-reported ratios, deliberately not absolute device comparisons.
fig,axes=plt.subplots(1,2,figsize=(10,6.25));fig.subplots_adjust(left=.1,right=.96,bottom=.23,top=.75,wspace=.4)
fig.text(.09,.93,'AUTHOR-REPORTED RESULTS · ONE MoE MODEL, TWO DEVICES',fontsize=10,color=GREEN,weight='bold');fig.text(.09,.86,'Active parameters do not predict device efficiency',fontsize=18)
for ax in axes:ax.spines[['top','right']].set_visible(False);ax.grid(axis='y',color='#dce3d8',linewidth=.7,zorder=0);ax.set_axisbelow(True)
axes[0].bar([0,1],[.90,.69],color=[GREEN,SAGE],width=.5,zorder=3);axes[0].axhline(1,ls='--',color=AMBER,lw=1);axes[0].set_xticks([0,1],['M2 Pro','Orin Nano\n8 GB']);axes[0].set_ylabel('MoE throughput / dense baseline');axes[0].set_ylim(0,1.25)
for i,v in enumerate([.90,.69]):axes[0].text(i,v+.04,f'≈{v:.2f}×',ha='center',fontsize=14)
axes[1].bar([0,1],[1,2.1],color=[SAGE,GREEN],width=.5,zorder=3);axes[1].set_xticks([0,1],['Dense\nbaseline','OLMoE']);axes[1].set_ylabel('Energy per token (normalized)');axes[1].set_ylim(0,2.7);axes[1].set_title('Orin Nano only',fontsize=13,pad=15)
for i,v in enumerate([1,2.1]):axes[1].text(i,v+.07,f'{v:.1f}×',ha='center',fontsize=14)
fig.text(.1,.08,'Baseline: Llama-3.2-1B on the same device. Approximate ratios from the abstract.\nSource: Alfarizy et al., arXiv:2606.21428v3. These are not QWERTY Labs measurements.',fontsize=10,color='#52675a',linespacing=1.7)
save(fig,'inference-reported-ratios','Author-reported approximate OLMoE to Llama 3.2 1B ratios: throughput 0.90 on M2 Pro and 0.69 on Orin Nano; energy per token 2.1 on Orin Nano. Each comparison uses the same device.')
data('inference-reported-ratios',['device','metric','moe_to_same_device_dense_baseline','source','evidence'],[['Apple M2 Pro','Throughput',.90,'arxiv:2606.21428v3 abstract','Approximate author-reported ratio'],['Jetson Orin Nano 8 GB','Throughput',.69,'arxiv:2606.21428v3 abstract','Approximate author-reported ratio'],['Jetson Orin Nano 8 GB','Energy per token',2.1,'arxiv:2606.21428v3 abstract','Approximate author-reported ratio']])
fig,ax=base('Lower watts can still mean more joules','Illustrative constant-power calculation')
ax.bar([0,1],[240,300],color=[GREEN,AMBER],width=.5,zorder=3);ax.set_xticks([0,1],['60 W × 4 s','25 W × 12 s']);ax.set_ylabel('Energy per completed request (joules)');ax.set_ylim(0,380)
for i,v in enumerate([240,300]):ax.text(i,v+12,f'{v} J',ha='center',fontsize=17)
fig.text(.12,.06,'Both configurations must meet the same output-quality and workload requirements.',fontsize=11,color='#52675a')
save(fig,'power-versus-energy','Illustrative constant-power example: 60 watts for 4 seconds uses 240 joules, while 25 watts for 12 seconds uses 300 joules.')
data('power-versus-energy',['configuration','power_watts','duration_seconds','energy_joules','evidence'],[['A',60,4,240,'Illustrative constant-power calculation'],['B',25,12,300,'Illustrative constant-power calculation']])

# Article 6: a hypothetical cascade, priced in normalized cost units.
fig,ax=base('A fallback adds to the first attempt','Illustrative routing-cost calculation')
r=np.linspace(0,1,101);cost=2+12*r
ax.plot(r*100,cost,color=GREEN,lw=2.6,label='Small first, large on fallback');ax.axhline(12,color=AMBER,ls='--',label='Large model for every request');ax.scatter([20],[4.4],color=GREEN,s=65,zorder=4)
ax.set_xlabel('Requests sent to the larger model (%)');ax.set_ylabel('Expected cost per request (normalized units)');ax.set_ylim(0,16);ax.legend(frameon=False,fontsize=11,loc='upper left')
fig.text(.12,.06,'Small attempt: 2 units · Large attempt: 12 units · Both costs apply on fallback.',fontsize=11,color='#52675a')
save(fig,'small-model-routing-cost','Illustrative cascade cost is 2 plus 12 times the fallback fraction. At 20 percent fallback the cost is 4.4 units compared with a 12-unit all-large baseline.')
data('small-model-routing-cost',['fallback_fraction','expected_cost_units','large_only_units','evidence'],[[round(x,3),round(2+12*x,3),12,'Illustrative; not measured model pricing'] for x in r])
fig,ax=base('Route by evidence, then verify the result','Conceptual small-model deployment');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
box(ax,.02,.60,.26,.26,'Small model','Narrow, tested task');box(ax,.37,.60,.26,.26,'External checks','Schema + policy + evidence');box(ax,.72,.60,.26,.26,'Accept result','Log the outcome')
box(ax,.37,.13,.26,.26,'Fallback route','Larger model or a person');box(ax,.72,.13,.26,.26,'Verify again','Same acceptance criteria')
arrow(ax,(.29,.73),(.36,.73));arrow(ax,(.64,.73),(.71,.73));arrow(ax,(.50,.59),(.50,.40));arrow(ax,(.64,.26),(.71,.26))
fig.text(.12,.06,'A model saying it is confident is not an independent acceptance check.',fontsize=11,color='#52675a')
save(fig,'small-model-routing','Conceptual cascade: a small model produces a result, external checks accept it or route it to a larger model or person, and a fallback result is verified again.')

# Article 7: deliberately simple symmetric quantisation, not a full production format.
fig,ax=base('Four bits represent a finite set of values','Analytical example · 15 symmetric levels')
w=np.linspace(-1,1,1001);reconstructed=np.round(w*7)/7
ax.plot(w,w,color=SAGE,lw=1.4,label='Original weight');ax.step(w,reconstructed,color=GREEN,lw=2,label='Reconstructed weight',where='mid');ax.set_xlabel('Original weight');ax.set_ylabel('Stored / reconstructed value');ax.legend(frameon=False,fontsize=11,loc='upper left')
fig.text(.12,.06,'Scale = 1/7; codes −7 to +7. One 4-bit code is unused in this toy example.',fontsize=11,color='#52675a')
save(fig,'quantisation-levels','Analytical symmetric quantisation example: weights in minus one to one are rounded to 15 levels with scale one seventh; one of sixteen four-bit codes is unused.')
data('quantisation-levels',['original_weight','reconstructed_weight','evidence'],[[round(float(x),6),round(float(np.round(x*7)/7),6),'Analytical toy quantiser'] for x in np.linspace(-1,1,29)])
fig,ax=base('Group metadata adds to the weight bytes','Analytical storage floor · 8 billion weights')
groups=[32,64,128,256];payload=np.full(4,4.);overhead=8e9/np.array(groups)*32/8/1e9
ax.bar(range(4),payload,color=GREEN,label='4-bit payload',zorder=3);ax.bar(range(4),overhead,bottom=payload,color=AMBER,label='32 metadata bits / group',zorder=3)
for i,v in enumerate(payload+overhead):ax.text(i,v+.13,f'{v:g} GB',ha='center',fontsize=15)
ax.set_xticks(range(4),[str(g) for g in groups]);ax.set_xlabel('Weights per group');ax.set_ylabel('Ideal storage (decimal GB)');ax.set_ylim(0,6.7);ax.legend(frameon=False,fontsize=11,loc='upper right')
fig.text(.12,.06,'An invented format with 16-bit scale + 16-bit zero point. Runtime memory excluded.',fontsize=10,color='#52675a')
save(fig,'quantisation-metadata','Analytical invented four-bit storage format for eight billion weights with 32 metadata bits per group: total storage is 5, 4.5, 4.25 and 4.125 GB at group sizes 32, 64, 128 and 256.')
data('quantisation-metadata',['parameters','payload_bits','group_size','metadata_bits_per_group','ideal_decimal_gb','evidence'],[[8000000000,4,g,32,float(4+o),'Analytical invented storage format'] for g,o in zip(groups,overhead)])

# Article 8: conditional success, with no assumption of independent stages.
fig,ax=base('Retrieval and adaptation solve different problems','Conceptual enterprise architecture');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
box(ax,.02,.63,.27,.26,'Current documents','Version + access control');box(ax,.37,.63,.27,.26,'Retrieval','Select supporting passages');box(ax,.73,.39,.24,.26,'Answer','Use evidence + behavior')
box(ax,.02,.11,.27,.26,'Approved examples','Task behavior + format');box(ax,.37,.11,.27,.26,'Adaptation','Versioned model / adapter')
arrow(ax,(.30,.76),(.36,.76));arrow(ax,(.65,.76),(.72,.56));arrow(ax,(.30,.24),(.36,.24));arrow(ax,(.65,.24),(.72,.45))
fig.text(.12,.06,'Both routes still need evaluation, authorization and a versioned deployment.',fontsize=11,color='#52675a')
save(fig,'rag-adaptation-architecture','Conceptual architecture: current authorized documents feed retrieval, approved task examples feed model adaptation, and both can contribute to an evidence-based answer.')
fig,ax=base('Good generation cannot replace missing evidence','Illustrative conditional-success calculation')
r=np.linspace(.4,1,61);ax.plot(r*100,r*.9*100,color=GREEN,lw=2.6);ax.scatter([80],[72],color=AMBER,s=65,zorder=4);ax.annotate('80% evidence found\n× 90% accepted given evidence\n= 72% end-to-end',(80,72),xytext=(43,78),fontsize=11,arrowprops={'arrowstyle':'-','color':AMBER})
ax.set_xlabel('Questions with sufficient retrieved evidence (%)');ax.set_ylabel('Accepted, evidence-supported answers (%)');ax.set_ylim(30,100)
fig.text(.12,.06,'Assumes a fixed 90% conditional acceptance rate; unsupported answers count as failures.',fontsize=10,color='#52675a')
save(fig,'rag-retrieval-ceiling','Illustrative conditional-success curve with a 90 percent acceptance rate given sufficient retrieved evidence. At 80 percent evidence retrieval the end-to-end rate is 72 percent.')
data('rag-retrieval-ceiling',['evidence_retrieval_fraction','acceptance_given_evidence','end_to_end_fraction','evidence'],[[round(x,3),.9,round(x*.9,6),'Illustrative conditional-success model'] for x in r])

# Article 9: overhead-aware parallelism.
fig,ax=base('Parallel work has a coordination cost','Illustrative extension of Amdahl-style arithmetic')
k=np.arange(1,9);relative=.3+.7/k+.04*(k-1);speed=1/relative
ax.plot(k,speed,color=GREEN,lw=2.6,marker='o');ax.scatter([4],[speed[3]],s=80,color=AMBER,zorder=4);ax.set_xticks(k);ax.set_xlabel('Parallel workers');ax.set_ylabel('Baseline time / elapsed time (×)');ax.set_ylim(.8,2)
fig.text(.12,.06,'30% serial work · 70% parallel work · Added overhead: 4% per extra worker.',fontsize=11,color='#52675a')
save(fig,'multi-agent-parallelism','Illustrative speedup with 30 percent serial work, 70 percent parallel work and coordination overhead of 4 percent of baseline time per extra worker. Four workers yield about 1.68 times speedup.')
data('multi-agent-parallelism',['workers','serial_fraction','parallel_fraction','overhead_per_extra_worker','relative_time','speedup','evidence'],[[int(n),.3,.7,.04,float(t),float(v),'Illustrative; not an agent benchmark'] for n,t,v in zip(k,relative,speed)])
fig,ax=base('Split the research; keep one decision record','Illustrative multi-agent blueprint');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
box(ax,.02,.37,.25,.30,'Coordinator','Scope + budgets');box(ax,.37,.69,.25,.22,'Evidence worker A','Technical findings');box(ax,.37,.39,.25,.22,'Evidence worker B','Operational findings');box(ax,.37,.09,.25,.22,'Evidence worker C','Conflicting evidence');box(ax,.73,.37,.24,.30,'Verifier + synthesis','One final evidence record')
for y in [.80,.50,.20]:arrow(ax,(.28,.52),(.36,y));arrow(ax,(.63,y),(.72,.52))
fig.text(.12,.06,'Workers return bounded evidence; a separate authorized path owns external actions.',fontsize=10,color='#52675a')
save(fig,'multi-agent-evidence','Illustrative coordinator delegates three bounded evidence searches. Each returns findings to a verifier and synthesizer; external actions are owned by a separate authorized path.')

# Article 10: a hypothetical workload, never a customer outcome.
fig,ax=base('Exceptions determine the handling workload','Illustrative accounts-payable example')
labels=['Baseline','Assisted'];routine=[300,1000*.7*2/60];review=[0,1000*.2*8/60];exception=[0,1000*.1*25/60];x=np.arange(2)
ax.bar(x,routine,color=GREEN,label='Baseline / routine handling',width=.5,zorder=3);ax.bar(x,review,bottom=routine,color=SAGE,label='Review queue',width=.5,zorder=3);ax.bar(x,exception,bottom=np.array(routine)+review,color=AMBER,label='Complex exceptions',width=.5,zorder=3)
for i,v in enumerate(np.array(routine)+review+exception):ax.text(i,v+8,f'{v:.1f} h',ha='center',fontsize=16)
ax.set_xticks(x,labels);ax.set_ylabel('Human handling hours per 1,000 invoices');ax.set_ylim(0,390);ax.legend(frameon=False,fontsize=10,loc='upper right')
fig.text(.12,.06,'Baseline: 18 min each · Assisted mix: 70% × 2 min, 20% × 8 min, 10% × 25 min.',fontsize=10,color='#52675a')
save(fig,'invoice-handling-time','Illustrative accounts payable workload: 1000 baseline invoices at 18 minutes take 300 hours; assisted handling at a 70/20/10 percent mix of 2/8/25 minutes takes 91.7 hours.')
data('invoice-handling-time',['path','fraction','cases','human_minutes_each','human_hours','evidence'],[['Routine',.7,700,2,700*2/60,'Illustrative'],['Review',.2,200,8,200*8/60,'Illustrative'],['Exception',.1,100,25,100*25/60,'Illustrative']])
fig,ax=base('An invoice can be drafted before it is approved','Illustrative AP control flow');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
labels=[('Capture + extract','Keep source coordinates'),('Validate + match','Vendor / PO / receipt'),('Route exceptions','Named review owner'),('Approve','Enforce spending authority'),('Post draft / record','Idempotent operation'),('Reconcile','Read back ledger state')]
coords=[(.02,.61),(.37,.61),(.72,.61),(.72,.17),(.37,.17),(.02,.17)]
for (label,small),(x,y) in zip(labels,coords):box(ax,x,y,.26,.26,label,small)
for a,b in [((.29,.74),(.36,.74)),((.64,.74),(.71,.74)),((.85,.59),(.85,.45)),((.71,.30),(.64,.30)),((.36,.30),(.29,.30))]:arrow(ax,a,b)
fig.text(.12,.06,'Payment release and vendor bank changes require separately authorized controls.',fontsize=11,color='#52675a')
save(fig,'invoice-control-flow','Illustrative invoice workflow: capture and extract, validate and match, route exceptions, approve, post idempotently and reconcile. Payment release and bank changes require separate authorization.')

# Article 11: one invented sequential turn, not summed production percentiles.
fig,ax=base('The first audible response has several delays','Illustrative sequential voice turn')
labels=['End-of-turn\nwait','Transcript\nfinalization','Model first\nuseful output','Speech first\naudio','Transport +\nplayout'];values=[350,120,280,150,100];starts=np.cumsum([0]+values[:-1])
for i,(start,value) in enumerate(zip(starts,values)):
    ax.barh(0,value,left=start,color=[SAGE,GREEN,AMBER,'#426b55','#bdcbb4'][i],edgecolor=PAPER,height=.42,zorder=3);ax.text(start+value/2,.32,f'{value} ms',ha='center',fontsize=11);ax.text(start+value/2,.63,labels[i],ha='center',va='center',fontsize=9)
ax.set_yticks([]);ax.set_xlim(0,1080);ax.set_ylim(-.5,.95);ax.set_xlabel('Time after the caller stops speaking (milliseconds)');ax.grid(axis='x',color='#dce3d8');ax.grid(axis='y',visible=False)
fig.text(.12,.06,'1,000 ms total in this example. Streaming stages can overlap in a real system.',fontsize=11,color='#52675a')
save(fig,'voice-response-budget','Illustrative sequential voice response budget: 350 ms end-of-turn wait, 120 ms transcription finalization, 280 ms model output, 150 ms speech synthesis and 100 ms transport, totaling 1000 ms.')
data('voice-response-budget',['stage','duration_ms','evidence'],[[label.replace('\n',' '),value,'Illustrative sequential turn; not production percentiles'] for label,value in zip(labels,values)])
fig,ax=base('Interrupt speech without losing transaction state','Illustrative voice-agent state separation');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
box(ax,.02,.62,.27,.26,'Caller speaks','Track the active turn');box(ax,.37,.62,.27,.26,'Stop playout','Cancel stale generation');box(ax,.73,.62,.24,.26,'Clarify intent','Keep confirmed facts')
box(ax,.02,.13,.27,.26,'Action record','Proposed / submitted');box(ax,.37,.13,.27,.26,'Reconcile status','Unknown is not failed');box(ax,.73,.13,.24,.26,'Confirm outcome','Speak verified state')
arrow(ax,(.30,.75),(.36,.75));arrow(ax,(.65,.75),(.72,.75));arrow(ax,(.30,.26),(.36,.26));arrow(ax,(.65,.26),(.72,.26))
fig.text(.12,.06,'Stopping audio does not undo a submitted booking, payment or account update.',fontsize=11,color='#52675a')
save(fig,'voice-interruption-state','Illustrative voice architecture separates caller and speech interruption state from action state: stopping playout does not undo a submitted transaction, which must be reconciled before confirming an outcome.')

# Article 12: an invented evaluation population and independent-repeat arithmetic.
fig,ax=base('Separate autonomous work from assisted completion','Illustrative evaluation scorecard · 500 cases')
labels=['Autonomous, correct','Autonomous, wrong','Completed after handoff','Unresolved'];counts=[320,15,125,40]
ax.barh(range(4),counts,color=[GREEN,AMBER,SAGE,'#84918a'],height=.58,zorder=3);ax.set_yticks(range(4),labels,fontsize=11);ax.invert_yaxis();ax.set_xlim(0,375);ax.set_xlabel('Cases');fig.subplots_adjust(left=.32)
for y,v in enumerate(counts):ax.text(v+6,y,str(v),va='center',fontsize=14)
fig.text(.12,.06,'Autonomous coverage: 67% · Autonomous error: 4.48% · Total correct completion: 89%',fontsize=10,color='#52675a')
save(fig,'agent-evaluation-scorecard','Invented evaluation of 500 cases: 320 correct autonomous outcomes, 15 wrong autonomous outcomes, 125 correct completions after handoff and 40 unresolved cases.')
data('agent-evaluation-scorecard',['outcome','cases','evidence'],[[label,n,'Illustrative; not evaluation results'] for label,n in zip(labels,counts)])
fig,ax=base('One success and consistent success differ','Analytical illustration · independent trials at p = 0.8')
k=np.arange(1,9);at_least=1-(1-.8)**k;every=.8**k
ax.plot(k,at_least*100,color=GREEN,lw=2.5,marker='o',label='At least one successful trial');ax.plot(k,every*100,color=AMBER,lw=2.5,marker='o',label='Every trial succeeds');ax.set_xticks(k);ax.set_ylim(0,110);ax.set_xlabel('Trials per task');ax.set_ylabel('Probability (%)');ax.legend(frameon=False,fontsize=11,loc='center right')
fig.text(.12,.06,'Constant success probability and independent trials are assumptions, not measured agent behavior.',fontsize=10,color='#52675a')
save(fig,'agent-repeat-reliability','Analytical independent trial illustration at single-trial success probability 0.8: the probability of at least one success rises with trials while the probability every trial succeeds falls.')
data('agent-repeat-reliability',['trials','single_trial_success','at_least_one','every_trial','evidence'],[[int(n),.8,float(a),float(b),'Analytical independent-trial illustration'] for n,a,b in zip(k,at_least,every)])

# Article 13: a quality-gated distillation proposal and hypothetical amortization.
fig,ax=base('The student learns from reviewed teaching material','Conceptual distillation pipeline');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
labels=[('Define the task','Rubric + held-out split'),('Generate examples','Record teacher + prompt'),('Review + filter','Check facts and permission'),('Train the student','Version data + objective'),('Evaluate independently','Slices + abstention'),('Deploy or revise','Keep the baseline')]
coords=[(.02,.61),(.37,.61),(.72,.61),(.72,.17),(.37,.17),(.02,.17)]
for (label,small),(x,y) in zip(labels,coords):box(ax,x,y,.26,.26,label,small)
for a,b in [((.29,.74),(.36,.74)),((.64,.74),(.71,.74)),((.85,.59),(.85,.45)),((.71,.30),(.64,.30)),((.36,.30),(.29,.30))]:arrow(ax,a,b)
fig.text(.12,.06,'Teacher agreement is not an independent test of task correctness.',fontsize=11,color='#52675a')
save(fig,'distillation-pipeline','Conceptual distillation process: define an independently evaluated task, generate teacher examples, review them, train a student, evaluate independently and deploy or revise.')
fig,ax=base('Training cost must be earned back in serving','Illustrative cost calculation · equal accepted workload')
n=np.arange(0,1001,10);teacher=10*n;student=1200+2*n
ax.plot(n,teacher,color=AMBER,lw=2.5,label='Teacher serving: 10 units / task');ax.plot(n,student,color=GREEN,lw=2.5,label='Student: 1,200 setup + 2 / task');ax.scatter([150],[1500],color=GREEN,s=65,zorder=4);ax.annotate('Break-even: 150 tasks',(150,1500),xytext=(350,700),fontsize=12,arrowprops={'arrowstyle':'-','color':GREEN});ax.set_xlabel('Accepted tasks served');ax.set_ylabel('Total cost (normalized units)');ax.legend(frameon=False,fontsize=11,loc='upper left')
fig.text(.12,.06,'Invented costs; assumes equal acceptance criteria and no extra fallback or review cost.',fontsize=10,color='#52675a')
save(fig,'distillation-break-even','Illustrative cost model: teacher costs ten units per accepted task, student costs 1200 setup units plus two per accepted task; totals are equal at 150 tasks.')
data('distillation-break-even',['accepted_tasks','teacher_units','student_units','evidence'],[[int(q),int(t),int(v),'Illustrative normalized costs'] for q,t,v in zip(n,teacher,student)])

# Article 14: cache arithmetic for a named hypothetical configuration, not a product.
fig,ax=base('Long context multiplies the attention-state budget','Analytical KV-cache calculation')
tokens=np.array([8192,16384,32768,65536,131072]);rows=[]
for batch,color in [(1,GREEN),(4,AMBER)]:
 gib=2*32*8*128*tokens*batch*2/2**30;ax.plot(tokens/1024,gib,color=color,lw=2.5,marker='o',label=f'{batch} concurrent sequence'+('s' if batch>1 else ''))
 for t,m in zip(tokens,gib):rows.append([32,8,128,int(t),batch,2,float(m),'Analytical hypothetical architecture'])
ax.set_xticks(tokens/1024,['8k','16k','32k','64k','128k']);ax.set_xlabel('Cached tokens per sequence (k = 1,024)');ax.set_ylabel('Ideal KV-cache storage (GiB)');ax.set_ylim(0,70);ax.legend(frameon=False,fontsize=11,loc='upper left')
fig.text(.12,.06,'32 layers · 8 KV heads · 128 values / head · 2 bytes / value; weights and overhead excluded.',fontsize=10,color='#52675a')
save(fig,'kv-cache-budget','Analytical KV-cache memory for a hypothetical 32-layer model with eight KV heads, head dimension 128 and two bytes per value. At 32768 tokens memory is four GiB for one sequence and sixteen GiB for four.')
data('kv-cache-budget',['layers','kv_heads','head_dimension','tokens','sequences','bytes_per_value','ideal_gib','evidence'],rows)
fig,ax=base('Logical order need not require contiguous storage','Conceptual paged cache mapping');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
box(ax,.02,.59,.26,.27,'Sequence A','Logical blocks A0, A1');box(ax,.37,.59,.26,.27,'Block table','A0 → 7; A1 → 2');box(ax,.72,.59,.26,.27,'Physical storage','Blocks 7 and 2')
box(ax,.02,.12,.26,.27,'Sequence B','Logical blocks B0, B1');box(ax,.37,.12,.26,.27,'Block table','B0 → 5; B1 → 9');box(ax,.72,.12,.26,.27,'Physical storage','Blocks 5 and 9')
for y in [.725,.255]:arrow(ax,(.29,y),(.36,y));arrow(ax,(.64,y),(.71,y))
fig.text(.12,.06,'Paging manages allocation; it does not remove the bytes needed for retained attention state.',fontsize=10,color='#52675a')
save(fig,'kv-cache-pages','Conceptual cache paging maps each sequence logical blocks through a block table into noncontiguous physical storage; retained attention state still occupies memory.')

# Article 15: a hypothetical business workflow with fixed review time.
fig,ax=base('Faster research leaves review on the critical path','Illustrative sales-operations handling time')
labels=['Research','Prepare CRM draft','Human review'];before=np.array([8,2,2]);after=np.array([2,1,2]);x=np.arange(3);width=.34
ax.bar(x-width/2,before,width,color=SAGE,label='Baseline',zorder=3);ax.bar(x+width/2,after,width,color=GREEN,label='Assisted',zorder=3);ax.set_xticks(x,labels,fontsize=11);ax.set_ylabel('Human minutes per prospect');ax.set_ylim(0,11);ax.legend(frameon=False,fontsize=11)
for i,(a,b) in enumerate(zip(before,after)):ax.text(i-width/2,a+.2,str(a),ha='center');ax.text(i+width/2,b+.2,str(b),ha='center')
fig.text(.12,.06,'Total: 12 → 5 minutes, or 2.4× handling capacity. No conversion or revenue uplift is assumed.',fontsize=10,color='#52675a')
save(fig,'sales-workflow-time','Illustrative human handling per prospect falls from twelve to five minutes: research eight to two, drafting two to one and review unchanged at two. The capacity ratio is 2.4, not a revenue claim.')
data('sales-workflow-time',['stage','baseline_minutes','assisted_minutes','evidence'],[[label,int(a),int(b),'Illustrative; not a customer result'] for label,a,b in zip(labels,before,after)])
fig,ax=base('Turn evidence into a reviewed CRM proposal','Illustrative sales-operations blueprint');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
labels=[('Select scope','Approved accounts + purpose'),('Research evidence','Sources + dates + gaps'),('Draft record changes','Field-level provenance'),('Review proposal','Named record owner'),('Write with controls','Permissions + version check'),('Verify + record','Read back changed fields')]
coords=[(.02,.61),(.37,.61),(.72,.61),(.72,.17),(.37,.17),(.02,.17)]
for (label,small),(x,y) in zip(labels,coords):box(ax,x,y,.26,.26,label,small)
for a,b in [((.29,.74),(.36,.74)),((.64,.74),(.71,.74)),((.85,.59),(.85,.45)),((.71,.30),(.64,.30)),((.36,.30),(.29,.30))]:arrow(ax,a,b)
fig.text(.12,.06,'Researching and updating an approved record does not authorize contacting the prospect.',fontsize=10,color='#52675a')
save(fig,'sales-workflow-controls','Illustrative sales operations flow: scope approved accounts, research evidence, draft field-level changes, review, write with permission and version checks, then verify the CRM record.')

# Article 16: invented data retention and independent record split arithmetic.
fig,ax=base('Track what each data decision removes','Illustrative corpus audit · document counts')
labels=['Raw inventory','After deduplication','After quality checks','After rights / privacy review'];counts=[100000,78000,70000,62000]
ax.barh(range(4),counts,color=[SAGE,'#789b83','#47795e',GREEN],height=.6,zorder=3);ax.set_yticks(range(4),labels,fontsize=11);ax.invert_yaxis();ax.set_xlim(0,116000);ax.set_xlabel('Documents retained');fig.subplots_adjust(left=.32)
for y,v in enumerate(counts):ax.text(v+1800,y,f'{v:,}',va='center',fontsize=13)
fig.text(.12,.06,'Invented sequential counts. Retention is not a measure of model quality or legal clearance.',fontsize=10,color='#52675a')
save(fig,'training-data-audit','Illustrative sequential corpus audit retains 100000 raw documents, 78000 after deduplication, 70000 after quality checks and 62000 after rights and privacy review. Counts are invented.')
data('training-data-audit',['stage','documents_retained','evidence'],[[label,n,'Illustrative corpus counts'] for label,n in zip(labels,counts)])
fig,ax=base('Record-level splits can leak duplicate families','Analytical illustration · independent 80 / 20 assignment')
m=np.arange(1,11);leak=1-.8**m-.2**m
ax.bar(m,leak*100,color=GREEN,width=.65,zorder=3);ax.set_xticks(m);ax.set_xlabel('Records in one duplicate family');ax.set_ylabel('Family appears in both splits (%)');ax.set_ylim(0,105)
fig.text(.12,.06,'Probability = 1 − 0.8^m − 0.2^m. Grouping a family into one split avoids this mechanism.',fontsize=10,color='#52675a')
save(fig,'duplicate-split-leakage','Analytical chance that a duplicate family appears in both train and test when each record independently goes to an 80 or 20 percent split: 1 minus 0.8 to the family size minus 0.2 to the family size.')
data('duplicate-split-leakage',['family_size','train_fraction','cross_split_probability','evidence'],[[int(n),.8,float(v),'Analytical independent assignment'] for n,v in zip(m,leak)])

# Article 17: an idealized proposal-and-verification cost model.
fig,ax=base('Draft length trades acceptance against extra work','Illustrative speculative-decoding cost model')
k=np.arange(1,9);rows=[]
for alpha,color in [(.5,SAGE),(.75,GREEN),(.9,AMBER)]:
 expected=(1-alpha**(k+1))/(1-alpha);round_cost=1+.1*(k-1)+.1*k;speed=expected/round_cost
 ax.plot(k,speed,color=color,lw=2.5,marker='o',label=f'Conditional acceptance α = {alpha:g}')
 for n,e,c,v in zip(k,expected,round_cost,speed):rows.append([int(n),alpha,float(e),float(c),float(v),'Illustrative normalized latency model'])
ax.axhline(1,ls='--',color='#84918a',lw=1);ax.set_xticks(k);ax.set_ylim(.5,3.5);ax.set_xlabel('Draft tokens proposed per round');ax.set_ylabel('Baseline time / expected time per token (×)');ax.legend(frameon=False,fontsize=10,loc='upper left')
fig.text(.12,.06,'Round cost = 1 + 0.1(k − 1) verification + 0.1k drafting; baseline = 1 unit / token.',fontsize=10,color='#52675a')
save(fig,'speculative-decoding-cost','Illustrative speculative decoding model compares expected tokens advanced per round with invented draft and verification costs. The useful draft length depends on conditional acceptance and round cost.')
data('speculative-decoding-cost',['draft_tokens','conditional_acceptance','expected_tokens_advanced','round_cost_units','speedup','evidence'],rows)
fig,ax=base('A rejected draft suffix is discarded','Conceptual speculative-sampling round');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
box(ax,.02,.62,.27,.26,'Draft proposal','A, B, C, D');box(ax,.37,.62,.27,.26,'Target verification','Accept A, B; reject C');box(ax,.73,.62,.24,.26,'Corrected sample','Draw X from residual')
box(ax,.12,.13,.32,.26,'Committed prefix','A, B, X');box(ax,.57,.13,.32,.26,'Next round','Discard D; start after X')
arrow(ax,(.30,.75),(.36,.75));arrow(ax,(.65,.75),(.72,.75));arrow(ax,(.85,.60),(.40,.41));arrow(ax,(.45,.26),(.56,.26))
fig.text(.12,.06,'Letter tokens are illustrative. Exactness requires the specified acceptance and correction rules.',fontsize=10,color='#52675a')
save(fig,'speculative-decoding-round','Conceptual speculative sampling: propose A B C D, accept A and B, reject C, draw a replacement X from the correction distribution, discard D and continue after A B X.')

# Article 18: staged release and a narrowly defined observation probability.
fig,ax=base('Expand a release with a measured stop condition','Illustrative production rollout');ax.set_axis_off();ax.set_xlim(0,1);ax.set_ylim(0,1)
labels=[('Replay + evaluate','Version the full system'),('Shadow traffic','No external writes'),('Small canary','Bound exposure + permissions'),('Compare + review','Quality + latency + actions'),('Expand or stop','Predefined decision owner'),('Recover','Route back; reconcile writes')]
coords=[(.02,.61),(.37,.61),(.72,.61),(.72,.17),(.37,.17),(.02,.17)]
for (label,small),(x,y) in zip(labels,coords):box(ax,x,y,.26,.26,label,small)
for a,b in [((.29,.74),(.36,.74)),((.64,.74),(.71,.74)),((.85,.59),(.85,.45)),((.71,.30),(.64,.30)),((.36,.30),(.29,.30))]:arrow(ax,a,b)
fig.text(.12,.06,'Routing back to an older version does not undo actions already completed by the new version.',fontsize=10,color='#52675a')
save(fig,'production-rollout','Illustrative release flow: replay evaluation, shadow traffic without writes, bounded canary, comparison and review, expand or stop, and recovery with reconciliation of completed writes.')
fig,ax=base('A small canary can miss an uncommon failure','Analytical illustration · independent observable failures')
n=np.unique(np.rint(np.logspace(1,4,100)).astype(int));rows=[]
for rate,color in [(.001,GREEN),(.01,AMBER)]:
 detection=1-(1-rate)**n;ax.plot(n,detection*100,color=color,lw=2.5,label=f'Failure probability = {rate:.1%}')
 for count,v in zip(n,detection):rows.append([int(count),rate,float(v),'Analytical independent observable failures'])
ax.set_xscale('log');ax.set_xticks([10,100,1000,10000],['10','100','1,000','10,000']);ax.set_ylim(0,108);ax.set_xlabel('Independent canary requests observed');ax.set_ylabel('Chance of observing at least one failure (%)');ax.legend(frameon=False,fontsize=11,loc='lower right')
fig.text(.12,.06,'This calculation assumes failures are detectable and identically distributed; it is not a safety certificate.',fontsize=10,color='#52675a')
save(fig,'canary-failure-observation','Analytical probability of observing at least one detectable failure in independent requests is 1 minus one minus failure probability to the number of requests. A small sample can miss uncommon failures.')
data('canary-failure-observation',['requests','failure_probability','observation_probability','evidence'],rows)
print(f'Generated {len(list(OUT.glob("*.svg")))} SVG figures and {len(list(OUT.glob("*.csv")))} CSV datasets with explicit evidence labels.')
