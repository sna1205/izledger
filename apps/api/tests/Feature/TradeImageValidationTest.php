<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Trade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TradeImageValidationTest extends TestCase
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

    public function test_trade_image_upload_rejects_unsupported_file_type_with_clear_message(): void
    {
        $trade = Trade::factory()->create([
            'account_id' => $this->createOwnedAccount()->id,
        ]);

        $response = $this->withHeaders(['If-Match' => '1'])->postJson("/api/trades/{$trade->id}/images", [
            'image' => UploadedFile::fake()->create('chart.gif', 256, 'image/gif'),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['image']);
        $response->assertJsonPath('errors.image.0', 'Only jpg, jpeg, png, webp, and bmp files are allowed.');
    }

    public function test_trade_image_upload_rejects_oversized_file_with_clear_message(): void
    {
        $trade = Trade::factory()->create([
            'account_id' => $this->createOwnedAccount()->id,
        ]);

        $response = $this->withHeaders(['If-Match' => '1'])->postJson("/api/trades/{$trade->id}/images", [
            'image' => UploadedFile::fake()->create('chart.jpg', 6 * 1024, 'image/jpeg'),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['image']);
        $response->assertJsonPath('errors.image.0', 'Each image must be 5MB or smaller.');
    }

    private function createOwnedAccount(): Account
    {
        return Account::factory()->create([
            'user_id' => $this->user->id,
        ]);
    }
}
