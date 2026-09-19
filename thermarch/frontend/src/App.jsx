import { useCallback, useEffect, useRef } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Section from "./components/Section";
import LocationInput from "./components/LocationInput";
import LoadingStages from "./components/LoadingStages";
import ErrorState from "./components/ErrorState";
import WeatherCard from "./components/WeatherCard";
import ClimateCard from "./components/ClimateCard";
import RecommendationPanel from "./components/RecommendationPanel";
import ReasoningPanel from "./components/ReasoningPanel";
import EmissionsPanel from "./components/EmissionsPanel";
import ClimateBasisBanner from "./components/ClimateBasisBanner";
import SeasonalStrategyPanel from "./components/SeasonalStrategyPanel";
import ThermalVisualization from "./components/ThermalVisualization";
import ParameterPanel from "./components/ParameterPanel";
import ScorecardPanel from "./components/ScorecardPanel";
import ComparisonPanel from "./components/ComparisonPanel";
import HowItWorks from "./components/HowItWorks";
import { useSimulation } from "./hooks/useSimulation";

const DEMO_LOCATIONS = ["Chennai", "Ladakh", "Dubai"];

export default function App() {
  const { loading, stageIndex, result, error, run } = useSimulation();
  const simulateRef = useRef(null);
  const resultsRef = useRef(null);
  const lastInput = useRef(null);

  const start = useCallback(
    (input) => {
      lastInput.current = input;
      run(input);
    },
    [run]
  );

  // Move focus to the results once they land, so keyboard users are not
  // stranded at the top of the page.
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.focus({ preventScroll: true });
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const scrollToSimulate = () =>
    simulateRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen">
      <a
        href="#simulate"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-2 focus:text-ink-deep"
      >
        Skip to simulation
      </a>

      <Header />

      <main>
        <Hero
          onStart={scrollToSimulate}
          onDemo={() => {
            scrollToSimulate();
            start({ location: "Chennai" });
          }}
        />

        <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 sm:px-6">
          <div id="simulate" ref={simulateRef} className="scroll-mt-24">
            <Section title="Simulate" note="Live climate data" ticked>
              <LocationInput onSubmit={start} loading={loading} />

              <div className="mt-6 border-t border-rule pt-5">
                <p className="annot mb-3">Demo mode</p>
                <div className="flex flex-wrap gap-3">
                  {DEMO_LOCATIONS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="btn-ghost px-4 py-2"
                      disabled={loading}
                      onClick={() => start({ location: name })}
                    >
                      Try {name}
                    </button>
                  ))}
                </div>
              </div>

              {loading && (
                <div className="mt-6 border-t border-rule pt-5">
                  <LoadingStages stageIndex={stageIndex} />
                </div>
              )}
            </Section>
          </div>

          {error && !loading && (
            <ErrorState
              error={error}
              onRetry={() => lastInput.current && start(lastInput.current)}
            />
          )}

          {result && !loading && (
            <div
              ref={resultsRef}
              tabIndex={-1}
              className="scroll-mt-24 space-y-6 focus:outline-none"
            >
              <WeatherCard location={result.location} weather={result.weather} climate={result.climate} />

              <ClimateBasisBanner
                climateBasis={result.climate_basis}
                normalPeriod={result.normal_period}
                designStrategy={result.design_strategy}
                designStrategyNote={result.design_strategy_note}
              />

              <div className="grid gap-6 lg:grid-cols-2">
                <ClimateCard climate={result.climate} />
                <ScorecardPanel profile={result.heuristic_profile} />
              </div>

              <RecommendationPanel recommendation={result.recommendation} />

              <SeasonalStrategyPanel
                summer={{ climate: result.climate, recommendation: result.recommendation, heuristic_profile: result.heuristic_profile }}
                winter={result.winter_design}
                designStrategy={result.design_strategy}
              />

              <ThermalVisualization
                recommendation={result.recommendation}
                climate={result.climate}
              />

              <ReasoningPanel
                explanations={result.explanations}
                reasoning={result.reasoning}
                siteAdaptation={result.site_adaptation}
              />

              <EmissionsPanel emissions={result.emissions} />

              <ParameterPanel recommendation={result.recommendation} />

              <ComparisonPanel primary={result} />
            </div>
          )}

          <div id="how-it-works" className="scroll-mt-24 pt-6">
            <HowItWorks />
          </div>
        </div>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-paper-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Thermarch &mdash; a computational design decision-support prototype.
            Not a validated building-performance simulation.
          </p>
          <p className="readout">{result ? result.engine : "Thermarch Rule Engine v1"}</p>
        </div>
      </footer>
    </div>
  );
}
