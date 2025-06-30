defmodule AstrupWeb.InterpretationLearnLive do
  @moduledoc """
  Learning page for Blood Gas Interpretation concepts and methodology.
  """
  use AstrupWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale}>
      <div class="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div class="mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold text-center mb-4">
            {gettext("Blood Gas Interpretation")}
          </h1>
          <p class="text-center text-base-content/70 mb-6">
            {gettext("Learn the fundamentals of ABG interpretation")}
          </p>
          
          <!-- Navigation to Quiz -->
          <div class="text-center mb-8">
            <.link navigate={~p"/interpretation-quiz"} class="btn btn-primary">
              {gettext("Take Interpretation Quiz")}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </.link>
          </div>
        </div>

        <div class="max-w-4xl mx-auto">
          <div class="prose prose-lg max-w-none">
            <div class="alert alert-info mb-8">
              <div class="flex">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>This learning section is under development. Content for ABG interpretation methodology will be added here.</span>
              </div>
            </div>
            
            <div class="grid md:grid-cols-2 gap-6 mb-8">
              <div class="card bg-base-200 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">Step-by-Step Methodology</h2>
                  <ul class="list-disc list-inside space-y-2">
                    <li>Assess pH for acidemia vs alkalemia</li>
                    <li>Determine primary disorder (respiratory vs metabolic)</li>
                    <li>Evaluate compensation mechanisms</li>
                    <li>Consider clinical context</li>
                  </ul>
                </div>
              </div>
              
              <div class="card bg-base-200 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title">Key Parameters</h2>
                  <ul class="list-disc list-inside space-y-2">
                    <li>pH: 7.35-7.45 (arterial)</li>
                    <li>pCO₂: 4.6-6.0 kPa (35-45 mmHg)</li>
                    <li>HCO₃⁻: 22-26 mmol/L</li>
                    <li>Base Excess: -2 to +2 mmol/L</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="space-y-8">
              <section>
                <h2 class="text-2xl font-bold mb-4">Coming Soon:</h2>
                <div class="grid md:grid-cols-3 gap-4">
                  <div class="card bg-base-100 shadow">
                    <div class="card-body">
                      <h3 class="card-title text-lg">Acid-Base Physiology</h3>
                      <p class="text-sm">Fundamental concepts of pH regulation and buffer systems.</p>
                    </div>
                  </div>
                  
                  <div class="card bg-base-100 shadow">
                    <div class="card-body">
                      <h3 class="card-title text-lg">Compensation Mechanisms</h3>
                      <p class="text-sm">How the body responds to acid-base disturbances.</p>
                    </div>
                  </div>
                  
                  <div class="card bg-base-100 shadow">
                    <div class="card-body">
                      <h3 class="card-title text-lg">Clinical Patterns</h3>
                      <p class="text-sm">Common ABG patterns and their clinical significance.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold mb-4">Practice Now</h2>
                <p class="mb-4">
                  Ready to test your interpretation skills? Try our interactive quiz with real clinical cases.
                </p>
                <.link navigate={~p"/interpretation-quiz"} class="btn btn-primary btn-lg">
                  {gettext("Start Interpretation Quiz")}
                </.link>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Layouts.app>
    """
  end
end