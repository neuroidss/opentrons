import pytest

from opentrons import instruments



pytest.fixture(hello):

@pytest.fixture
def deck():
    deck = instrument.MagDeck()

def test_raise_deck(deck):
    deck.rise(height=.20)
    assert deck.get_height() == 20
