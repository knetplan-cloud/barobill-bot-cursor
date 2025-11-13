import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, tone } = await req.json();
    console.log('AI Chat request:', { question, tone });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = tone === 'formal'
      ? `당신은 바로빌의 세무 전문 AI 상담원 '빌리'입니다.
존댓말을 사용하여 전문적이고 친절하게 답변해주세요.

전문 분야:
- 세금계산서 발급 및 수정
- 부가세 신고 (예정신고, 확정신고)
- 전자세금계산서 시스템
- 바로빌 서비스 이용 방법
- 세무 관련 일반 상담

답변 시 주의사항:
- 정확한 정보를 바탕으로 답변
- 복잡한 세무 문제는 전문가 상담 권유
- 바로빌 고객센터: 1544-8385
- 친절하고 이해하기 쉬운 설명`
      : `당신은 바로빌의 세무 전문 AI 상담원 '빌리'야.
반말을 사용하여 친근하고 편하게 답변해줘.

전문 분야:
- 세금계산서 발급 및 수정
- 부가세 신고 (예정신고, 확정신고)
- 전자세금계산서 시스템
- 바로빌 서비스 이용 방법
- 세무 관련 일반 상담

답변 시 주의사항:
- 정확한 정보를 바탕으로 답변
- 복잡한 세무 문제는 전문가 상담 권유
- 바로빌 고객센터: 1544-8385
- 친근하고 이해하기 쉬운 설명`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'rate_limit',
            message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
          }), 
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'payment_required',
            message: 'AI 사용량이 초과되었습니다. 관리자에게 문의해주세요.'
          }), 
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('AI response generated successfully');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'internal_error',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
