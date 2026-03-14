<?php

namespace Tests\Feature;

use App\Models\MissedTrade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MissedTradeValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    public function test_missed_trade_creation_requires_at_least_one_reason_tag(): void
    {
        $response = $this->postJson('/api/missed-trades', [
            'pair' => 'EURUSD',
            'model' => 'Breakout',
            'reason' => '   ',
            'date' => now()->subHour()->toIso8601String(),
            'notes' => 'Observed but skipped.',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['reason']);
    }

    public function test_missed_trade_creation_rejects_future_date(): void
    {
        $response = $this->postJson('/api/missed-trades', [
            'pair' => 'EURUSD',
            'model' => 'Breakout',
            'reason' => 'hesitation',
            'date' => now()->addDay()->toIso8601String(),
            'notes' => 'Observed but skipped.',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['date']);
    }

    public function test_missed_trade_update_rejects_future_date(): void
    {
        $entry = MissedTrade::factory()->create([
            'user_id' => $this->user->id,
            'reason' => 'hesitation',
            'date' => now()->subDay(),
        ]);

        $response = $this->putJson("/api/missed-trades/{$entry->id}", [
            'date' => now()->addDay()->toIso8601String(),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['date']);
    }

    public function test_missed_trade_normalizes_reason_tags_before_persisting(): void
    {
        $response = $this->postJson('/api/missed-trades', [
            'pair' => 'EURUSD',
            'model' => 'Breakout',
            'reason' => ' Late Entry, hesitation, session:New York ',
            'date' => now()->subHour()->toIso8601String(),
            'notes' => 'Observed but skipped.',
        ]);

        $response->assertCreated();
        $this->assertSame('late-entry, hesitation, session:new-york', (string) $response->json('reason'));
    }
}
