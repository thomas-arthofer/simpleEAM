import { analyzeBusinessCapability } from '../evaluator'
import { cyclicApplicationFixture } from './fixtures'

describe('analyzeBusinessCapability — cycle safety (D-03)', () => {
  it('terminates within 1 second and returns a finite findings array for a cyclic components graph', () => {
    const start = Date.now()

    const result = analyzeBusinessCapability(cyclicApplicationFixture)

    const durationMs = Date.now() - start
    expect(durationMs).toBeLessThan(1000)

    expect(Array.isArray(result.findings)).toBe(true)
    expect(Number.isFinite(result.findings.length)).toBe(true)
  })

  it('classifies both nodes of the cycle exactly once each (no infinite re-entry)', () => {
    const result = analyzeBusinessCapability(cyclicApplicationFixture)

    const aFindings = result.findings.filter(f => f.violatingElementId === 'app-cycle-a')
    const bFindings = result.findings.filter(f => f.violatingElementId === 'app-cycle-b')

    // Each node has 4 dimensions classified exactly once — never duplicated
    // by re-entering the cycle.
    // security: required MEDIUM. A achieves MEDIUM (satisfied, no finding for
    // that dimension — but the other 3 dims are GREY since unset). B
    // achieves LOW → deviation = 1 → YELLOW under Phase 5 D-02 (was RED
    // pre-Phase-5) plus 3 GREY.
    expect(aFindings).toHaveLength(3)
    expect(aFindings.every(f => f.status === 'GREY')).toBe(true)
    expect(aFindings.some(f => f.status === 'RED')).toBe(false)

    expect(bFindings).toHaveLength(4)
    expect(bFindings.filter(f => f.status === 'GREY')).toHaveLength(3)
    const bYellow = bFindings.filter(f => f.status === 'YELLOW')
    expect(bYellow).toHaveLength(1)
    expect(bYellow[0]).toMatchObject({
      violatingElementId: 'app-cycle-b',
      dimension: 'security',
      requiredLevel: 'MEDIUM',
      actualLevel: 'LOW',
    })
  })
})
