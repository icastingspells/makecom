import type { CompanyCore } from '../../server/src/core/types';
type EditableCore = Pick<CompanyCore, 'identity' | 'contacts' | 'people' | 'business' | 'product' | 'faq'>;

export function fillCoreEditor(core: CompanyCore) {
  for (let i = 0; i < 5; i++) {
    (document.getElementById(`faq_q_${i}`) as HTMLInputElement).value = core.faq?.[i]?.q || '';
    (document.getElementById(`faq_a_${i}`) as HTMLTextAreaElement).value = core.faq?.[i]?.a || '';
  }
  (document.getElementById('c_brand') as HTMLInputElement).value = core.identity?.brandName || '';
  (document.getElementById('c_legal') as HTMLInputElement).value = core.identity?.legalEntityName || '';
  (document.getElementById('c_city') as HTMLInputElement).value = core.contacts?.city || '';
  (document.getElementById('c_phone') as HTMLInputElement).value = core.contacts?.phone || '';
  (document.getElementById('c_address') as HTMLInputElement).value = core.contacts?.address || '';
  (document.getElementById('c_email') as HTMLInputElement).value = core.contacts?.email || '';
  (document.getElementById('c_ceo_name') as HTMLInputElement).value = core.people?.ceo?.name || '';
  (document.getElementById('c_ceo_title') as HTMLInputElement).value = core.people?.ceo?.title || '';
  (document.getElementById('c_ceo_bio') as HTMLTextAreaElement).value = core.people?.ceo?.bio || '';
  (document.getElementById('c_h1_name') as HTMLInputElement).value = core.people?.heads?.[0]?.name || '';
  (document.getElementById('c_h1_title') as HTMLInputElement).value = core.people?.heads?.[0]?.title || '';
  (document.getElementById('c_h1_bio') as HTMLTextAreaElement).value = core.people?.heads?.[0]?.bio || '';
  (document.getElementById('c_h2_name') as HTMLInputElement).value = core.people?.heads?.[1]?.name || '';
  (document.getElementById('c_h2_title') as HTMLInputElement).value = core.people?.heads?.[1]?.title || '';
  (document.getElementById('c_h2_bio') as HTMLTextAreaElement).value = core.people?.heads?.[1]?.bio || '';
  (document.getElementById('c_history') as HTMLTextAreaElement).value = core.business?.history || '';
  (document.getElementById('c_spec') as HTMLTextAreaElement).value = core.business?.specialization || '';
  (document.getElementById('c_audience') as HTMLTextAreaElement).value = core.business?.targetAudience || '';
  (document.getElementById('c_problem') as HTMLTextAreaElement).value = core.business?.clientProblem || '';
  (document.getElementById('c_inputs') as HTMLTextAreaElement).value = core.product?.inputs || '';
  (document.getElementById('c_process') as HTMLTextAreaElement).value = core.product?.process || '';
  (document.getElementById('c_result') as HTMLTextAreaElement).value = core.product?.result || '';
  (document.getElementById('c_limits') as HTMLTextAreaElement).value = core.product?.limits || '';
}

export function gatherCoreFromEditor(): EditableCore {
  return {
    faq: Array.from({ length: 5 }, (_, i) => ({
      q: (document.getElementById(`faq_q_${i}`) as HTMLInputElement).value,
      a: (document.getElementById(`faq_a_${i}`) as HTMLTextAreaElement).value
    })) as CompanyCore['faq'],
    identity: {
      brandName: (document.getElementById('c_brand') as HTMLInputElement).value,
      legalEntityName: (document.getElementById('c_legal') as HTMLInputElement).value
    },
    contacts: {
      city: (document.getElementById('c_city') as HTMLInputElement).value,
      address: (document.getElementById('c_address') as HTMLInputElement).value,
      phone: (document.getElementById('c_phone') as HTMLInputElement).value,
      email: (document.getElementById('c_email') as HTMLInputElement).value
    },
    people: {
      ceo: {
        name: (document.getElementById('c_ceo_name') as HTMLInputElement).value,
        title: (document.getElementById('c_ceo_title') as HTMLInputElement).value,
        bio: (document.getElementById('c_ceo_bio') as HTMLTextAreaElement).value
      },
      heads: [
        {
          name: (document.getElementById('c_h1_name') as HTMLInputElement).value,
          title: (document.getElementById('c_h1_title') as HTMLInputElement).value,
          bio: (document.getElementById('c_h1_bio') as HTMLTextAreaElement).value
        },
        {
          name: (document.getElementById('c_h2_name') as HTMLInputElement).value,
          title: (document.getElementById('c_h2_title') as HTMLInputElement).value,
          bio: (document.getElementById('c_h2_bio') as HTMLTextAreaElement).value
        }
      ]
    },
    business: {
      history: (document.getElementById('c_history') as HTMLTextAreaElement).value,
      specialization: (document.getElementById('c_spec') as HTMLTextAreaElement).value,
      targetAudience: (document.getElementById('c_audience') as HTMLTextAreaElement).value,
      clientProblem: (document.getElementById('c_problem') as HTMLTextAreaElement).value
    },
    product: {
      inputs: (document.getElementById('c_inputs') as HTMLTextAreaElement).value,
      process: (document.getElementById('c_process') as HTMLTextAreaElement).value,
      result: (document.getElementById('c_result') as HTMLTextAreaElement).value,
      limits: (document.getElementById('c_limits') as HTMLTextAreaElement).value
    }
  };
}
