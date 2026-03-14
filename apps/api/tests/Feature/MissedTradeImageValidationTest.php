<?php

namespace Tests\Feature;

use App\Models\MissedTrade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MissedTradeImageValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config()->set('filesystems.trade_images_disk', 'public');

        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    public function test_missed_trade_image_upload_rejects_unsupported_file_type_with_clear_message(): void
    {
        $missedTrade = MissedTrade::factory()->create([
            'user_id' => $this->user->id,
        ]);

        $response = $this->postJson("/api/missed-trades/{$missedTrade->id}/images", [
            'image' => UploadedFile::fake()->create('setup.gif', 256, 'image/gif'),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['image']);
        $response->assertJsonPath('errors.image.0', 'Only jpg, jpeg, png, webp, and bmp files are allowed.');
    }

    public function test_missed_trade_image_upload_rejects_oversized_file_with_clear_message(): void
    {
        $missedTrade = MissedTrade::factory()->create([
            'user_id' => $this->user->id,
        ]);

        $response = $this->postJson("/api/missed-trades/{$missedTrade->id}/images", [
            'image' => UploadedFile::fake()->create('setup.jpg', 6 * 1024, 'image/jpeg'),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['image']);
        $response->assertJsonPath('errors.image.0', 'Each image must be 5MB or smaller.');
    }
}
